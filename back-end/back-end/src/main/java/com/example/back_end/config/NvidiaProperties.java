package com.example.back_end.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "nvidia")
public class NvidiaProperties {

    /** Injected from application.properties → nvidia.api-key */
    private String apiKey;

    /**
     * Default chat model: Llama 3.3 70B is the best balance of SOTA reasoning and
     * speed
     */
    private String defaultChatModel = NvidiaModel.LLAMA_3_3_70B.name();

    /**
     * Default vision model: Llama 3.2 11B Vision is ultra-fast for damage analysis
     */
    private String defaultVisionModel = NvidiaModel.LLAMA_3_2_11B_VISION.name();

    /** Default document/CV model */
    private String defaultDocumentModel = NvidiaModel.NEMOTRON_TABLE_STRUCTURE.name();

    /** Global timeout for API calls (single HTTP request; pipeline runs several sequentially) */
    private int timeoutSeconds = 120;

    /**
     * Lighter chat model used when the primary model fails (timeout / error) to
     * finish the pipeline faster.
     */
    private String fastFallbackChatModel = NvidiaModel.LLAMA_3_1_8B.name();

    /** Max chars sent for contract + pièces jointes in prompts (keeps payloads fast) */
    private int maxContractChars = 6000;
    private int maxSupportingDocChars = 8000;

    /** Whether to enable streaming responses by default */
    private boolean streamingEnabled = false;

    // ── Getters & Setters ─────────────────────────────────────────────────────
    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public NvidiaModel getDefaultChatModel() {
        return NvidiaModel.valueOf(defaultChatModel);
    }

    public void setDefaultChatModel(String defaultChatModel) {
        this.defaultChatModel = defaultChatModel;
    }

    public NvidiaModel getDefaultVisionModel() {
        return NvidiaModel.valueOf(defaultVisionModel);
    }

    public void setDefaultVisionModel(String defaultVisionModel) {
        this.defaultVisionModel = defaultVisionModel;
    }

    public NvidiaModel getDefaultDocumentModel() {
        return NvidiaModel.valueOf(defaultDocumentModel);
    }

    public void setDefaultDocumentModel(String defaultDocumentModel) {
        this.defaultDocumentModel = defaultDocumentModel;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public NvidiaModel getFastFallbackChatModel() {
        return NvidiaModel.valueOf(fastFallbackChatModel);
    }

    public void setFastFallbackChatModel(String fastFallbackChatModel) {
        this.fastFallbackChatModel = fastFallbackChatModel;
    }

    public int getMaxContractChars() {
        return maxContractChars;
    }

    public void setMaxContractChars(int maxContractChars) {
        this.maxContractChars = maxContractChars;
    }

    public int getMaxSupportingDocChars() {
        return maxSupportingDocChars;
    }

    public void setMaxSupportingDocChars(int maxSupportingDocChars) {
        this.maxSupportingDocChars = maxSupportingDocChars;
    }

    public boolean isStreamingEnabled() {
        return streamingEnabled;
    }

    public void setStreamingEnabled(boolean streamingEnabled) {
        this.streamingEnabled = streamingEnabled;
    }
}
