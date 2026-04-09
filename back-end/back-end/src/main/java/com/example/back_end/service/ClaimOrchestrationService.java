package com.example.back_end.service;

import com.example.back_end.config.AssurGoSystemPrompts;
import com.example.back_end.config.NvidiaModel;
import com.example.back_end.config.NvidiaProperties;
import com.example.back_end.dto.NvidiaRequest;
import com.example.back_end.dto.NvidiaResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * AssurGo Claim Orchestration Service — 3-agent pipeline with truncation, fast-model
 * retry, and structured JSON fallback when NVIDIA is unavailable.
 */
@Service
public class ClaimOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(ClaimOrchestrationService.class);
    private static final ObjectMapper PRE_ANALYSIS_MAPPER = new ObjectMapper();

    private final NvidiaAIService aiService;
    private final NvidiaPromptBuilder promptBuilder;
    private final NvidiaProperties props;
    private final ClaimAnalysisFallbackService fallbackService;

    public ClaimOrchestrationService(
            NvidiaAIService aiService,
            NvidiaPromptBuilder promptBuilder,
            NvidiaProperties props,
            ClaimAnalysisFallbackService fallbackService) {
        this.aiService = aiService;
        this.promptBuilder = promptBuilder;
        this.props = props;
        this.fallbackService = fallbackService;
    }

    public NvidiaResponse processClaim(
            String claimDescription,
            String claimType,
            String contractSummary,
            String legalDocumentText,
            String ragContext,
            String imageBase64,
            String imageMimeType,
            String insuredId,
            String supportingDocumentsText) {
        long start = System.currentTimeMillis();
        log.info("[Orchestrator] Starting 3-agent pipeline (insuredId={}, type={})", insuredId, claimType);

        String contractTrunc = truncate(contractSummary, props.getMaxContractChars());
        String supportTrunc = truncate(supportingDocumentsText, props.getMaxSupportingDocChars());
        String ragTrunc = truncate(ragContext, 4000);

        NvidiaModel primaryChat = props.getDefaultChatModel();
        if (primaryChat == null) {
            log.error("[Orchestrator] Default chat model is NULL. Check properties.");
            return NvidiaResponse.error("none", "Configuration error: default chat model not found", 500);
        }
        NvidiaModel fastChat = props.getFastFallbackChatModel();

        // ── Step 1: Claim analysis ────────────────────────────────────────────
        log.info("[Orchestrator] Step 1: Claim text / coverage (primary={})...", primaryChat.name());
        NvidiaResponse claimAnalysis = runClaimAnalysisStep(claimDescription, claimType, contractTrunc,
                legalDocumentText, ragTrunc, supportTrunc, primaryChat);

        if (!claimAnalysis.isSuccess() && !primaryChat.equals(fastChat)) {
            log.warn("[Orchestrator] Step 1 failed on primary; retry with fast model {}...", fastChat.name());
            claimAnalysis = runClaimAnalysisStep(claimDescription, claimType, contractTrunc,
                    legalDocumentText, ragTrunc, supportTrunc, fastChat);
        }

        if (!claimAnalysis.isSuccess()) {
            log.error("[Orchestrator] Step 1 failed completely: {}", claimAnalysis.getErrorMessage());
            String json = fallbackService.buildFallbackOrchestratorJson(claimDescription, claimType, null, null,
                    "Étape analyse sinistre: " + claimAnalysis.getErrorMessage());
            return NvidiaResponse.success("assurgo-local-fallback", json);
        }

        // ── Step 2: Vision (optional) — try lighter vision if primary times out ─
        NvidiaResponse imageAnalysis = null;
        if (imageBase64 != null && !imageBase64.isBlank()) {
            log.info("[Orchestrator] Step 2: Damage image...");
            imageAnalysis = runImageAnalysis(claimDescription, claimType, imageBase64, imageMimeType,
                    props.getDefaultVisionModel());
            if (!imageAnalysis.isSuccess()) {
                NvidiaModel altVision = alternativeVisionModel(props.getDefaultVisionModel());
                if (altVision != null) {
                    log.warn("[Orchestrator] Vision retry with {}...", altVision.name());
                    imageAnalysis = runImageAnalysis(claimDescription, claimType, imageBase64, imageMimeType,
                            altVision);
                }
            }
            if (!imageAnalysis.isSuccess()) {
                log.warn("[Orchestrator] Image analysis skipped: {}", imageAnalysis != null
                        ? imageAnalysis.getErrorMessage()
                        : "null");
                imageAnalysis = null;
            }
        }

        String claimJson = claimAnalysis.getContent();
        String imageJson = (imageAnalysis != null && imageAnalysis.isSuccess()) ? imageAnalysis.getContent()
                : "{}";
        String docExcerptForOrch = buildOrchestratorDocExcerpt(supportTrunc);

        // ── Step 3: Final orchestrator ───────────────────────────────────────
        log.info("[Orchestrator] Step 3: Final decision (primary chat)...");
        NvidiaResponse finalDecision = runOrchestratorStep(claimDescription, claimJson, imageJson, claimType,
                insuredId, docExcerptForOrch, primaryChat);

        if (!finalDecision.isSuccess() && !primaryChat.equals(fastChat)) {
            log.warn("[Orchestrator] Step 3 failed; retry orchestrator with fast model...");
            finalDecision = runOrchestratorStep(claimDescription, claimJson, imageJson, claimType, insuredId,
                    docExcerptForOrch, fastChat);
        }

        long duration = System.currentTimeMillis() - start;
        if (finalDecision.isSuccess()) {
            log.info("[Orchestrator] Pipeline SUCCESS in {}ms", duration);
            return finalDecision;
        }

        log.error("[Orchestrator] Pipeline FAILED after retries: {}", finalDecision.getErrorMessage());
        String json = fallbackService.buildFallbackOrchestratorJson(claimDescription, claimType,
                claimJson, "{}".equals(imageJson) ? null : imageJson,
                "Orchestrateur NVIDIA: " + finalDecision.getErrorMessage());
        return NvidiaResponse.success("assurgo-local-fallback", json);
    }

    /**
     * Synthèse finale : un seul appel orchestrateur, en s'appuyant sur les sorties
     * {@code analyze-claim} et {@code analyze-image} (texte brut), sans refaire agents 1 et 2.
     */
    public NvidiaResponse processFinalSynthesisFromPreAnalyses(
            String claimDescription,
            String claimType,
            String contractSummary,
            String insuredId,
            String supportingDocumentsText,
            String preClaimRaw,
            String preImageRaw,
            String preConstatRaw) {
        long start = System.currentTimeMillis();
        log.info("[Orchestrator] Final synthesis from pré-analyses (insuredId={})", insuredId);

        NvidiaModel primaryChat = props.getDefaultChatModel();
        NvidiaModel fastChat = props.getFastFallbackChatModel();
        if (primaryChat == null) {
            log.error("[Orchestrator] Default chat model is NULL.");
            return NvidiaResponse.error("none", "Configuration error: default chat model not found", 500);
        }

        String supportTrunc = truncate(supportingDocumentsText, props.getMaxSupportingDocChars());
        String docExcerpt = buildOrchestratorDocExcerpt(supportTrunc);

        String claimSlot = wrapPreAnalysisSlot("analyze-claim", preClaimRaw);
        String imageSlot = wrapPreAnalysisSlot("analyze-image", preImageRaw);
        String constatSlot = wrapPreAnalysisSlot("analyze-constat", preConstatRaw);

        NvidiaResponse finalDecision = runFinalSynthesisOrchestratorStep(claimDescription, claimSlot, imageSlot, constatSlot,
                claimType, insuredId, docExcerpt, primaryChat);

        if (!finalDecision.isSuccess() && !primaryChat.equals(fastChat)) {
            log.warn("[Orchestrator] Final synthesis retry with fast model...");
            finalDecision = runFinalSynthesisOrchestratorStep(claimDescription, claimSlot, imageSlot, constatSlot, claimType,
                    insuredId, docExcerpt, fastChat);
        }

        long duration = System.currentTimeMillis() - start;
        if (finalDecision.isSuccess()) {
            log.info("[Orchestrator] Final synthesis SUCCESS in {}ms", duration);
            return finalDecision;
        }

        log.error("[Orchestrator] Final synthesis FAILED: {}", finalDecision.getErrorMessage());
        String json = fallbackService.buildFallbackOrchestratorJson(claimDescription, claimType, claimSlot,
                imageSlot, "Synthèse finale: " + finalDecision.getErrorMessage());
        return NvidiaResponse.success("assurgo-local-fallback", json);
    }

    private static String wrapPreAnalysisSlot(String source, String raw) {
        try {
            ObjectNode n = PRE_ANALYSIS_MAPPER.createObjectNode();
            n.put("source", source);
            if (raw == null || raw.isBlank()) {
                n.put("note", "Non disponible — pré-analyse non fournie ou vide.");
                return PRE_ANALYSIS_MAPPER.writeValueAsString(n);
            }
            n.put("rawContent", truncate(raw, 14000));
            return PRE_ANALYSIS_MAPPER.writeValueAsString(n);
        } catch (Exception e) {
            log.warn("wrapPreAnalysisSlot {}: {}", source, e.getMessage());
            return "{\"source\":\"" + source + "\",\"note\":\"erreur encodage\"}";
        }
    }

    private NvidiaResponse runFinalSynthesisOrchestratorStep(String claimDescription, String claimJson,
            String imageJson, String constatJson, String claimType, String insuredId, String documentsExcerpt, NvidiaModel chatModel) {
        NvidiaRequest orchReq = NvidiaRequest.builder()
                .model(chatModel)
                .systemPrompt(AssurGoSystemPrompts.FINAL_SYNTHESIS_FROM_PRE_ANALYSES)
                .userPrompt(promptBuilder.buildFinalSynthesisFromPreAnalysesPrompt(claimDescription, claimJson,
                        imageJson, constatJson, claimType, insuredId, documentsExcerpt))
                .temperature(0.05)
                .maxTokens(3600)
                .build();
        return aiService.call(orchReq);
    }

    public NvidiaResponse analyzeConstatText(String claimDescription, String claimType, String constatText) {
        NvidiaModel model = props.getDefaultChatModel();
        if (model == null) {
            return NvidiaResponse.error("none", "Configuration error: default chat model not found", 500);
        }
        String prompt = "=== TYPE SINISTRE ===\n" + (claimType != null ? claimType : "AUTO") + "\n\n"
                + "=== DÉCLARATION ASSURÉ ===\n" + (claimDescription != null ? claimDescription : "(non fournie)") + "\n\n"
                + "=== CONSTAT EXTRAIT ===\n" + (constatText != null ? truncate(constatText, 12000) : "(vide)");
        NvidiaResponse r = quickChat(model, AssurGoSystemPrompts.CONSTAT_ANALYSIS, prompt);
        if (r.isSuccess()) {
            return r;
        }
        NvidiaModel fast = props.getFastFallbackChatModel();
        if (fast != null && !fast.equals(model)) {
            return quickChat(fast, AssurGoSystemPrompts.CONSTAT_ANALYSIS, prompt);
        }
        return r;
    }

    private NvidiaResponse runClaimAnalysisStep(String claimDescription, String claimType,
            String contractSummary, String legalDocumentText, String ragContext,
            String supportingDocumentsText, NvidiaModel chatModel) {
        NvidiaRequest claimReq = NvidiaRequest.builder()
                .model(chatModel)
                .systemPrompt(AssurGoSystemPrompts.CLAIM_ANALYSIS)
                .userPrompt(claimDescription)
                .claimType(claimType)
                .contractSummary(contractSummary)
                .legalDocumentText(legalDocumentText)
                .supportingDocumentsText(
                        supportingDocumentsText != null ? supportingDocumentsText : "")
                .ragContext(ragContext)
                .temperature(0.10)
                .maxTokens(2048)
                .build();

        NvidiaRequest claimReqFull = NvidiaRequest.builder()
                .model(chatModel)
                .systemPrompt(AssurGoSystemPrompts.CLAIM_ANALYSIS)
                .userPrompt(promptBuilder.buildClaimAnalysisPrompt(claimReq))
                .temperature(0.10)
                .maxTokens(2048)
                .build();

        return aiService.call(claimReqFull);
    }

    private NvidiaResponse runImageAnalysis(String claimDescription, String claimType,
            String imageBase64, String imageMimeType, NvidiaModel visionModel) {
        NvidiaRequest imgRequest = NvidiaRequest.builder()
                .model(visionModel)
                .systemPrompt(AssurGoSystemPrompts.IMAGE_DAMAGE_ANALYSIS)
                .userPrompt(promptBuilder.buildImageAnalysisPrompt(
                        NvidiaRequest.builder()
                                .model(visionModel)
                                .claimType(claimType)
                                .userPrompt(claimDescription)
                                .build()))
                .imageBase64(imageBase64, imageMimeType != null ? imageMimeType : "image/jpeg")
                .temperature(0.10)
                .maxTokens(1024)
                .build();
        return aiService.call(imgRequest);
    }

    /** If default vision is the heavy 90B model, offer 11B as retry; else try Phi vision once. */
    private static NvidiaModel alternativeVisionModel(NvidiaModel current) {
        if (current == NvidiaModel.LLAMA_3_2_90B_VISION) {
            return NvidiaModel.LLAMA_3_2_11B_VISION;
        }
        if (current == NvidiaModel.LLAMA_3_2_11B_VISION) {
            return NvidiaModel.PHI_3_5_VISION;
        }
        return null;
    }

    private NvidiaResponse runOrchestratorStep(String claimDescription, String claimJson, String imageJson,
            String claimType, String insuredId, String documentsExcerpt, NvidiaModel chatModel) {
        NvidiaRequest orchReq = NvidiaRequest.builder()
                .model(chatModel)
                .systemPrompt(AssurGoSystemPrompts.ORCHESTRATOR)
                .userPrompt(promptBuilder.buildOrchestratorPrompt(claimDescription, claimJson, imageJson, claimType,
                        insuredId, documentsExcerpt))
                .temperature(0.05)
                .maxTokens(3200)
                .build();
        return aiService.call(orchReq);
    }

    /** Extrait court pour l'orchestrateur (déjà tronqué côté pipeline par maxSupportingDocChars). */
    private static String buildOrchestratorDocExcerpt(String supportTrunc) {
        if (supportTrunc == null || supportTrunc.isBlank()) {
            return "(Aucun texte n'a été extrait des pièces jointes — fichiers absents, illisibles ou non PDF/TXT.)";
        }
        int max = 1800;
        if (supportTrunc.length() <= max) {
            return supportTrunc;
        }
        return supportTrunc.substring(0, max) + "\n… [tronqué]";
    }

    private static String truncate(String s, int maxLen) {
        if (s == null || s.isBlank()) {
            return s == null ? "" : s;
        }
        if (s.length() <= maxLen) {
            return s;
        }
        return s.substring(0, maxLen) + "\n… [texte tronqué pour limite API]";
    }

    public NvidiaResponse quickChat(NvidiaModel model, String systemPrompt, String userMessage) {
        return aiService.call(NvidiaRequest.builder()
                .model(model)
                .systemPrompt(systemPrompt)
                .userPrompt(userMessage)
                .temperature(0.3)
                .build());
    }

    public NvidiaResponse quickImageAnalysis(NvidiaModel model, String prompt, String base64, String mime) {
        return aiService.call(NvidiaRequest.builder()
                .model(model)
                .systemPrompt(AssurGoSystemPrompts.IMAGE_DAMAGE_ANALYSIS)
                .userPrompt(prompt)
                .imageBase64(base64, mime)
                .temperature(0.10)
                .build());
    }

    public NvidiaResponse embed(String text) {
        return aiService.call(NvidiaRequest.builder()
                .model(NvidiaModel.EMBED_NV_EMBED_V2)
                .textToEmbed(text)
                .build());
    }

    public NvidiaResponse extractDocument(String base64Image, String mimeType) {
        return aiService.call(NvidiaRequest.builder()
                .model(NvidiaModel.NEMOTRON_TABLE_STRUCTURE)
                .userPrompt("Extract all structured data from this insurance document.")
                .imageBase64(base64Image, mimeType)
                .build());
    }
}
