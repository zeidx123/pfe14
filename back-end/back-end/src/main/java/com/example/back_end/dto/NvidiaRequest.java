package com.example.back_end.dto;

import com.example.back_end.config.NvidiaModel;

/**
 * Unified request object passed to NvidiaAIService.
 * Build it via the fluent builder — only fill fields relevant to your model
 * type.
 */
public class NvidiaRequest {

    // ── Which model to use ────────────────────────────────────────────────────
    private NvidiaModel model;

    // ── Text prompt / system prompt ───────────────────────────────────────────
    private String systemPrompt;
    private String userPrompt;

    // ── Image (base64 encoded, for VISION_CHAT and DOCUMENT_CV models) ────────
    private String imageBase64; // pure base64 string
    private String imageMimeType; // e.g. "image/png", "image/jpeg"

    // ── Generation parameters ─────────────────────────────────────────────────
    private Integer maxTokens;
    private Double temperature;
    private Double topP;

    // ── Embedding input (for EMBEDDING models) ────────────────────────────────
    private String textToEmbed;

    // ── Context injected by RAG pipeline ─────────────────────────────────────
    private String ragContext; // retrieved chunks concatenated

    // ── Sinistre metadata (injected into system prompt automatically) ─────────
    private String claimType; // e.g. "AUTO", "HABITATION", "SANTE"
    private String contractSummary; // summary of user's contract
    private String legalDocumentText; // relevant legal clauses for this claim type
    /** Extracted text from PDF / pièces jointes uploadées par l'assuré */
    private String supportingDocumentsText;

    private NvidiaRequest() {
    }

    // ── Fluent Builder ────────────────────────────────────────────────────────
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final NvidiaRequest req = new NvidiaRequest();

        public Builder model(NvidiaModel model) {
            req.model = model;
            return this;
        }

        public Builder systemPrompt(String sp) {
            req.systemPrompt = sp;
            return this;
        }

        public Builder userPrompt(String up) {
            req.userPrompt = up;
            return this;
        }

        public Builder imageBase64(String b64, String mime) {
            req.imageBase64 = b64;
            req.imageMimeType = mime;
            return this;
        }

        public Builder maxTokens(int n) {
            req.maxTokens = n;
            return this;
        }

        public Builder temperature(double t) {
            req.temperature = t;
            return this;
        }

        public Builder topP(double p) {
            req.topP = p;
            return this;
        }

        public Builder textToEmbed(String t) {
            req.textToEmbed = t;
            return this;
        }

        public Builder ragContext(String ctx) {
            req.ragContext = ctx;
            return this;
        }

        public Builder claimType(String ct) {
            req.claimType = ct;
            return this;
        }

        public Builder contractSummary(String cs) {
            req.contractSummary = cs;
            return this;
        }

        public Builder legalDocumentText(String ld) {
            req.legalDocumentText = ld;
            return this;
        }

        public Builder supportingDocumentsText(String s) {
            req.supportingDocumentsText = s;
            return this;
        }

        public NvidiaRequest build() {
            if (req.model == null)
                throw new IllegalStateException("model is required");
            return req;
        }
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    public NvidiaModel getModel() {
        return model;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public String getUserPrompt() {
        return userPrompt;
    }

    public String getImageBase64() {
        return imageBase64;
    }

    public String getImageMimeType() {
        return imageMimeType;
    }

    public Integer getMaxTokens() {
        return maxTokens;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Double getTopP() {
        return topP;
    }

    public String getTextToEmbed() {
        return textToEmbed;
    }

    public String getRagContext() {
        return ragContext;
    }

    public String getClaimType() {
        return claimType;
    }

    public String getContractSummary() {
        return contractSummary;
    }

    public String getLegalDocumentText() {
        return legalDocumentText;
    }

    public String getSupportingDocumentsText() {
        return supportingDocumentsText;
    }
}
