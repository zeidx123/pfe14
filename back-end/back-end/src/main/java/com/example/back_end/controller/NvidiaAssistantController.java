package com.example.back_end.controller;

import com.example.back_end.config.AssurGoSystemPrompts;
import com.example.back_end.config.NvidiaModel;
import com.example.back_end.dto.NvidiaResponse;
import com.example.back_end.service.ClaimOrchestrationService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * REST controller for the NVIDIA AI assistant.
 *
 * Routes:
 * POST /api/assistant/v1/chat → Free-form chat with the AI assistant
 * POST /api/assistant/v1/analyze-claim → Full 3-agent claim analysis pipeline
 * POST /api/assistant/v1/analyze-image → Image-only damage analysis
 * POST /api/assistant/v1/extract-document → Document OCR / extraction
 * POST /api/assistant/v1/embed → Text embedding vector
 */
@RestController
@RequestMapping("/api/assistant/v1")
@CrossOrigin("*")
public class NvidiaAssistantController {

    private final ClaimOrchestrationService orchestrationService;

    public NvidiaAssistantController(ClaimOrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    // ── 1. Free-form chat ─────────────────────────────────────────────────────
    // Route: POST http://localhost:8080/api/assistant/v1/chat
    // Body (JSON): { "message": "...", "systemPrompt": "...", "model":
    // "MISTRAL_LARGE_3" }
    @PostMapping("/chat")
    public ResponseEntity<NvidiaResponse> chat(
            @RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "");
        String systemPrompt = body.getOrDefault("systemPrompt", AssurGoSystemPrompts.GENERAL_ASSISTANT);
        String modelName = body.getOrDefault("model", "MISTRAL_LARGE_3");

        NvidiaModel model;
        try {
            model = NvidiaModel.valueOf(modelName);
        } catch (IllegalArgumentException e) {
            model = NvidiaModel.MISTRAL_LARGE_3;
        }

        NvidiaResponse response = orchestrationService.quickChat(model, systemPrompt, message);
        return ResponseEntity.ok(response);
    }

    // ── 2. Full claim analysis pipeline ───────────────────────────────────────
    // Route: POST http://localhost:8080/api/assistant/v1/analyze-claim
    @PostMapping("/analyze-claim")
    public ResponseEntity<NvidiaResponse> analyzeClaim(
            @RequestParam String claimDescription,
            @RequestParam String claimType,
            @RequestParam(defaultValue = "") String contractSummary,
            @RequestParam(defaultValue = "") String legalDocumentText,
            @RequestParam(defaultValue = "") String ragContext,
            @RequestParam(required = false) MultipartFile damageImage,
            @RequestParam(defaultValue = "unknown") String insuredId) {

        try {
            String imageBase64 = null;
            String imageMime = null;

            if (damageImage != null && !damageImage.isEmpty()) {
                imageBase64 = Base64.getEncoder().encodeToString(damageImage.getBytes());
                imageMime = damageImage.getContentType();
            }

            NvidiaResponse response = orchestrationService.processClaim(
                    claimDescription, claimType, contractSummary,
                    legalDocumentText, ragContext, imageBase64, imageMime, insuredId, "");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(NvidiaAssistantController.class)
                    .error("CRITICAL: Error in analyze-claim pipeline", e);
            return ResponseEntity.internalServerError()
                    .body(NvidiaResponse.error("none", "Pipeline error: " + e.getMessage(), 500));
        }
    }

    // ── 3. Image-only damage analysis ─────────────────────────────────────────
    // Route: POST http://localhost:8080/api/assistant/v1/analyze-image
    @PostMapping("/analyze-image")
    public ResponseEntity<NvidiaResponse> analyzeImage(
            @RequestParam MultipartFile image,
            @RequestParam(defaultValue = "Analyze the damage in this image.") String prompt,
            @RequestParam(defaultValue = "LLAMA_3_2_90B_VISION") String model) throws Exception {
        String base64 = Base64.getEncoder().encodeToString(image.getBytes());
        NvidiaModel nvidiaModel;
        try {
            nvidiaModel = NvidiaModel.valueOf(model);
        } catch (IllegalArgumentException e) {
            nvidiaModel = NvidiaModel.LLAMA_3_2_90B_VISION;
        }
        NvidiaResponse response = orchestrationService.quickImageAnalysis(nvidiaModel, prompt, base64,
                image.getContentType());
        return ResponseEntity.ok(response);
    }

    // ── 4. Document extraction ─────────────────────────────────────────────────
    @PostMapping("/analyze-constat")
    public ResponseEntity<NvidiaResponse> analyzeConstat(
            @RequestParam("constat") MultipartFile constat,
            @RequestParam(defaultValue = "AUTO") String claimType,
            @RequestParam(defaultValue = "") String claimDescription) throws Exception {
        String constatText = extractPlainTextFromMultipart(constat);
        if (constatText.isBlank()) {
            return ResponseEntity.ok(NvidiaResponse.success("assurgo-constat-parser",
                    "{\"isConstatValid\":false,\"validityReason\":\"Constat illisible ou non exploitable\","
                            + "\"liabilityDecision\":\"INDETERMINEE\",\"responsibilityExplanation\":\"Impossible de déterminer la responsabilité avec le fichier fourni\","
                            + "\"confidenceScore\":0.2,\"missingInformation\":[\"Constat lisible (PDF/TXT) ou photos plus nettes\"]}"));
        }
        NvidiaResponse response = orchestrationService.analyzeConstatText(claimDescription, claimType, constatText);
        return ResponseEntity.ok(response);
    }

    // ── 5. Document extraction ─────────────────────────────────────────────────
    // Route: POST http://localhost:8080/api/assistant/v1/extract-document
    @PostMapping("/extract-document")
    public ResponseEntity<NvidiaResponse> extractDocument(
            @RequestParam MultipartFile document) throws Exception {
        String base64 = Base64.getEncoder().encodeToString(document.getBytes());
        NvidiaResponse response = orchestrationService.extractDocument(base64, document.getContentType());
        return ResponseEntity.ok(response);
    }

    // ── 6. Text embedding ─────────────────────────────────────────────────────
    // Route: POST http://localhost:8080/api/assistant/v1/embed
    @PostMapping("/embed")
    public ResponseEntity<NvidiaResponse> embed(@RequestParam String text) {
        return ResponseEntity.ok(orchestrationService.embed(text));
    }

    private static String extractPlainTextFromMultipart(MultipartFile file) {
        try {
            String ct = file.getContentType();
            String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
            byte[] bytes = file.getBytes();
            boolean isPdf = (ct != null && "application/pdf".equalsIgnoreCase(ct))
                    || name.toLowerCase().endsWith(".pdf");
            if (isPdf) {
                try (PDDocument pdf = PDDocument.load(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    return stripper.getText(pdf);
                }
            }
            boolean isText = (ct != null && ct.toLowerCase().startsWith("text/"))
                    || name.toLowerCase().endsWith(".txt");
            if (isText) {
                return new String(bytes, StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
            // keep blank => handled by caller
        }
        return "";
    }
}
