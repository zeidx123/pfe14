package com.example.back_end.dto;

import java.util.List;

/**
 * Unified response from any NVIDIA model call.
 */
public class NvidiaResponse {

    private boolean success;
    private String modelUsed;

    // ── Chat / Vision response ─────────────────────────────────────────────
    private String content; // main text output from the model

    // ── Structured analysis (populated by AssurGo orchestrator) ───────────
    private Double confidenceScore; // 0.0 – 1.0
    private String decision; // "AUTO_APPROVED", "MANUAL_REVIEW", "REJECTED"
    private Double estimatedAmount; // indemnification estimate in local currency
    private String severityLevel; // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    private String coverageStatus; // "COVERED", "PARTIALLY_COVERED", "NOT_COVERED"

    // ── Embedding response ─────────────────────────────────────────────────
    private List<Double> embedding;

    // ── Raw response (for Document/CV models) ─────────────────────────────
    private Object rawResponse;

    // ── Error info ─────────────────────────────────────────────────────────
    private String errorMessage;
    private int httpStatus;

    private NvidiaResponse() {
    }

    // ── Static factories ───────────────────────────────────────────────────
    public static NvidiaResponse success(String modelUsed, String content) {
        NvidiaResponse r = new NvidiaResponse();
        r.success = true;
        r.modelUsed = modelUsed;
        r.content = content;
        return r;
    }

    public static NvidiaResponse error(String modelUsed, String errorMessage, int httpStatus) {
        NvidiaResponse r = new NvidiaResponse();
        r.success = false;
        r.modelUsed = modelUsed;
        r.errorMessage = errorMessage;
        r.httpStatus = httpStatus;
        return r;
    }

    // ── Fluent setters (return this for chaining) ──────────────────────────
    public NvidiaResponse confidenceScore(Double score) {
        this.confidenceScore = score;
        return this;
    }

    public NvidiaResponse decision(String d) {
        this.decision = d;
        return this;
    }

    public NvidiaResponse estimatedAmount(Double amt) {
        this.estimatedAmount = amt;
        return this;
    }

    public NvidiaResponse severityLevel(String lvl) {
        this.severityLevel = lvl;
        return this;
    }

    public NvidiaResponse coverageStatus(String status) {
        this.coverageStatus = status;
        return this;
    }

    public NvidiaResponse embedding(List<Double> emb) {
        this.embedding = emb;
        return this;
    }

    public NvidiaResponse rawResponse(Object raw) {
        this.rawResponse = raw;
        return this;
    }

    // ── Getters ────────────────────────────────────────────────────────────
    public boolean isSuccess() {
        return success;
    }

    public String getModelUsed() {
        return modelUsed;
    }

    public String getContent() {
        return content;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public String getDecision() {
        return decision;
    }

    public Double getEstimatedAmount() {
        return estimatedAmount;
    }

    public String getSeverityLevel() {
        return severityLevel;
    }

    public String getCoverageStatus() {
        return coverageStatus;
    }

    public List<Double> getEmbedding() {
        return embedding;
    }

    public Object getRawResponse() {
        return rawResponse;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
