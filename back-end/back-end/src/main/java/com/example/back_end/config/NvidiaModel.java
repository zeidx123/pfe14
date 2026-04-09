package com.example.back_end.config;

/**
 * All NVIDIA NIM models available via the NVIDIA API.
 * Switch between them by passing the desired enum value.
 */
public enum NvidiaModel {

    // ── LLM / Chat Completion models ─────────────────────────────────────────
    KIMI_K2_5(
            "moonshotai/kimi-k2.5",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            16384),
    MISTRAL_LARGE_3(
            "mistralai/mistral-large-3-675b-instruct-2512",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            2048),
    LLAMA_3_3_70B(
            "meta/llama-3.3-70b-instruct",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    LLAMA_3_1_8B(
            "meta/llama-3.1-8b-instruct",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    MIXTRAL_8X7B(
            "mistralai/mixtral-8x7b-instruct-v0.1",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    MIXTRAL_8X22B(
            "mistralai/mixtral-8x22b-instruct-v0.1",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    GEMMA_2_27B(
            "google/gemma-2-27b-it",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            8192),
    PHI_3_5_MINI(
            "microsoft/phi-3.5-mini-instruct",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    NEMOTRON_4_340B(
            "nvidia/nemotron-4-340b-instruct",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    NEMOTRON_MINI_4B(
            "nvidia/nemotron-mini-4b-instruct",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    DEEPSEEK_R1(
            "deepseek-ai/deepseek-r1",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            8192),
    DEEPSEEK_V3(
            "deepseek-ai/deepseek-v3",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            8192),
    QWQ_32B(
            "qwen/qwq-32b",
            ModelType.CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            8192),
    LLAMA_3_2_90B_VISION(
            "meta/llama-3.2-90b-vision-instruct",
            ModelType.VISION_CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    LLAMA_3_2_11B_VISION(
            "meta/llama-3.2-11b-vision-instruct",
            ModelType.VISION_CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),
    PHI_3_5_VISION(
            "microsoft/phi-3.5-vision-instruct",
            ModelType.VISION_CHAT,
            "https://integrate.api.nvidia.com/v1/chat/completions",
            4096),

    // ── Document / CV Specialist models ──────────────────────────────────────
    NEMOTRON_TABLE_STRUCTURE(
            "nvidia/nemotron-table-structure-v1",
            ModelType.DOCUMENT_CV,
            "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-table-structure-v1",
            0),
    NEVA_22B(
            "nvidia/neva-22b",
            ModelType.VISION_CHAT,
            "https://ai.api.nvidia.com/v1/vlm/nvidia/neva-22b",
            1024),
    KOSMOS_2(
            "microsoft/kosmos-2",
            ModelType.VISION_CHAT,
            "https://ai.api.nvidia.com/v1/vlm/microsoft/kosmos-2",
            1024),
    PADDLE_OCR(
            "baidu/paddleocr",
            ModelType.DOCUMENT_CV,
            "https://ai.api.nvidia.com/v1/cv/baidu/paddleocr",
            0),

    // ── Embedding models ──────────────────────────────────────────────────────
    EMBED_NV_EMBED_V2(
            "nvidia/nv-embed-v2",
            ModelType.EMBEDDING,
            "https://integrate.api.nvidia.com/v1/embeddings",
            0),
    EMBED_RETRIEVAL_MISTRAL(
            "nvidia/nv-embedqa-mistral-7b-v2",
            ModelType.EMBEDDING,
            "https://integrate.api.nvidia.com/v1/embeddings",
            0);

    // ─────────────────────────────────────────────────────────────────────────
    public final String modelId;
    public final ModelType type;
    public final String endpoint;
    public final int defaultMaxTokens;

    NvidiaModel(String modelId, ModelType type, String endpoint, int defaultMaxTokens) {
        this.modelId = modelId;
        this.type = type;
        this.endpoint = endpoint;
        this.defaultMaxTokens = defaultMaxTokens;
    }

    public enum ModelType {
        CHAT, // text-only LLMs
        VISION_CHAT, // multimodal LLMs (text + image)
        DOCUMENT_CV, // specialist CV / OCR / table-structure models
        EMBEDDING // vector embedding models
    }
}
