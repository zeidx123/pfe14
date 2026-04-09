package com.example.back_end.service;

import com.example.back_end.dto.NvidiaResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class OrchestratorAgent {

    private final ClaimOrchestrationService claimOrchestrationService;
    private final ClaimAnalysisFallbackService claimAnalysisFallbackService;

    public OrchestratorAgent(ClaimOrchestrationService claimOrchestrationService,
            ClaimAnalysisFallbackService claimAnalysisFallbackService) {
        this.claimOrchestrationService = claimOrchestrationService;
        this.claimAnalysisFallbackService = claimAnalysisFallbackService;
    }

    /**
     * Déclaration sans pré-analyses persistées : pipeline complet (3 agents).
     */
    public String processClaim(String userMessage, org.springframework.web.multipart.MultipartFile imageFile,
            String contractContent, String claimType, String supportingDocumentsText, String insuredId) {
        return processClaim(userMessage, imageFile, contractContent, claimType, supportingDocumentsText, insuredId, null,
                null, null);
    }

    /**
     * Si {@code preClaimAnalysis} ou {@code preImageAnalysis} sont fournis : une seule étape de synthèse
     * combine les sorties des APIs analyze-claim / analyze-image. Sinon : pipeline complet.
     *
     * @param insuredId CIN ou identifiant assuré
     */
    public String processClaim(String userMessage, org.springframework.web.multipart.MultipartFile imageFile,
            String contractContent, String claimType, String supportingDocumentsText, String insuredId,
            String preClaimAnalysis, String preImageAnalysis, String preConstatAnalysis) {

        try {
            String id = StringUtils.hasText(insuredId) ? insuredId : "unknown";
            String support = supportingDocumentsText != null ? supportingDocumentsText : "";

            boolean usePreAnalyses = StringUtils.hasText(preClaimAnalysis)
                    || StringUtils.hasText(preImageAnalysis)
                    || StringUtils.hasText(preConstatAnalysis);

            NvidiaResponse response;
            if (usePreAnalyses) {
                response = claimOrchestrationService.processFinalSynthesisFromPreAnalyses(userMessage, claimType,
                        contractContent, id, support, preClaimAnalysis, preImageAnalysis, preConstatAnalysis);
            } else {
                String imageBase64 = null;
                String imageMime = null;
                if (imageFile != null && !imageFile.isEmpty()) {
                    imageBase64 = java.util.Base64.getEncoder().encodeToString(imageFile.getBytes());
                    imageMime = imageFile.getContentType();
                }
                response = claimOrchestrationService.processClaim(userMessage, claimType, contractContent, "", "",
                        imageBase64, imageMime, id, support);
            }

            if (response.isSuccess()) {
                return response.getContent();
            }

            return claimAnalysisFallbackService.buildFallbackOrchestratorJson(userMessage, claimType, null, null,
                    response.getErrorMessage());

        } catch (Exception e) {
            return claimAnalysisFallbackService.buildFallbackOrchestratorJson(userMessage, claimType, null, null,
                    e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }
}
