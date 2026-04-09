package com.example.back_end.service;

import com.example.back_end.config.NvidiaModel;
import com.example.back_end.config.NvidiaModel.ModelType;
import com.example.back_end.config.NvidiaProperties;
import com.example.back_end.dto.NvidiaRequest;
import com.example.back_end.dto.NvidiaResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.concurrent.TimeoutException;

/**
 * Core NVIDIA AI service.
 * Routes every NvidiaRequest to the correct endpoint and payload format
 * based on the model type (CHAT, VISION_CHAT, DOCUMENT_CV, EMBEDDING).
 */
@Service
public class NvidiaAIService {

    private static final Logger log = LoggerFactory.getLogger(NvidiaAIService.class);

    private final WebClient webClient;
    private final NvidiaProperties props;
    private final ObjectMapper mapper;

    public NvidiaAIService(
            @Qualifier("nvidiaWebClient") WebClient webClient,
            NvidiaProperties props,
            ObjectMapper mapper) {
        this.webClient = webClient;
        this.props = props;
        this.mapper = mapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public entry point — auto-routes based on model type
    // ─────────────────────────────────────────────────────────────────────────

    public NvidiaResponse call(NvidiaRequest req) {
        NvidiaModel model = req.getModel();
        log.info("[NvidiaAI] Calling model={} type={}", model.modelId, model.type);

        try {
            return switch (model.type) {
                case CHAT -> callChatCompletion(req, false);
                case VISION_CHAT -> callChatCompletion(req, true);
                case DOCUMENT_CV -> callDocumentCV(req);
                case EMBEDDING -> callEmbedding(req);
            };
        } catch (WebClientResponseException ex) {
            log.error("[NvidiaAI] HTTP {} from model {}: {}", ex.getStatusCode(), model.modelId,
                    ex.getResponseBodyAsString());
            return NvidiaResponse.error(model.modelId, ex.getMessage(), ex.getStatusCode().value());
        } catch (Exception ex) {
            log.error("[NvidiaAI] Unexpected error calling model {}: {}", model.modelId, ex.getMessage(), ex);
            return NvidiaResponse.error(model.modelId, ex.getMessage(), 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Chat Completion (CHAT and VISION_CHAT models)
    // ─────────────────────────────────────────────────────────────────────────

    private NvidiaResponse callChatCompletion(NvidiaRequest req, boolean includeImage) {
        NvidiaModel model = req.getModel();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("model", model.modelId);
        payload.put("max_tokens", resolveMaxTokens(req, model));
        payload.put("temperature", req.getTemperature() != null ? req.getTemperature() : 0.15);
        payload.put("top_p", req.getTopP() != null ? req.getTopP() : 1.0);
        payload.put("stream", false);

        // Kimi K2.5 and other models - removed chat_template_kwargs as it's
        // non-standard for some NIM endpoints
        // and could cause 400 Bad Request if not supported by the proxy.

        ArrayNode messages = payload.putArray("messages");

        // System message
        if (req.getSystemPrompt() != null && !req.getSystemPrompt().isBlank()) {
            ObjectNode sysMsg = messages.addObject();
            sysMsg.put("role", "system");
            sysMsg.put("content", req.getSystemPrompt());
        }

        // User message (text only or text + image)
        ObjectNode userMsg = messages.addObject();
        userMsg.put("role", "user");

        if (includeImage && req.getImageBase64() != null) {
            ArrayNode contentArray = userMsg.putArray("content");

            ObjectNode imagePart = contentArray.addObject();
            imagePart.put("type", "image_url");
            ObjectNode imageUrl = imagePart.putObject("image_url");
            imageUrl.put("url", "data:" + req.getImageMimeType() + ";base64," + req.getImageBase64());

            ObjectNode textPart = contentArray.addObject();
            textPart.put("type", "text");
            textPart.put("text", req.getUserPrompt() != null ? req.getUserPrompt() : "Analyze this image.");

        } else {
            userMsg.put("content", req.getUserPrompt() != null ? req.getUserPrompt() : "");
        }

        log.info("[NvidiaAI] POST {} size={} model={}", model.endpoint, payload.toString().length(), model.modelId);

        try {
            String rawResponse = webClient.post()
                    .uri(model.endpoint)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(3))
                            .maxBackoff(Duration.ofSeconds(30))
                            .filter(this::isRetriableNetworkError)
                            .doBeforeRetry(
                                    s -> log.warn("[NvidiaAI] Retry {} for {}: {}", s.totalRetries() + 1,
                                            model.modelId, s.failure().toString())))
                    .block();

            if (rawResponse == null || rawResponse.isBlank()) {
                log.error("[NvidiaAI] Empty response from {}", model.modelId);
                return NvidiaResponse.error(model.modelId, "Empty response from AI model", 500);
            }

            return parseChatCompletionResponse(model, rawResponse);
        } catch (WebClientResponseException e) {
            log.error("[NvidiaAI] API Error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return NvidiaResponse.error(model.modelId, "NVIDIA API Error: " + e.getStatusCode(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            log.error("[NvidiaAI] Request failed for {}: {}", model.modelId, e.getMessage());
            return NvidiaResponse.error(model.modelId, "Connection failed: " + e.getMessage(), 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Document / CV models
    // ─────────────────────────────────────────────────────────────────────────

    private NvidiaResponse callDocumentCV(NvidiaRequest req) {
        NvidiaModel model = req.getModel();
        ObjectNode payload = mapper.createObjectNode();
        ArrayNode input = payload.putArray("input");

        if (req.getImageBase64() != null) {
            ObjectNode imageObj = input.addObject();
            imageObj.put("type", "image_url");
            imageObj.put("url", "data:" + req.getImageMimeType() + ";base64," + req.getImageBase64());
        }

        if (req.getUserPrompt() != null) {
            ObjectNode textObj = input.addObject();
            textObj.put("type", "text");
            textObj.put("text", req.getUserPrompt());
        }

        String rawResponse = webClient.post()
                .uri(model.endpoint)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(3))
                        .maxBackoff(Duration.ofSeconds(30))
                        .filter(this::isRetriableNetworkError)
                        .doBeforeRetry(s -> log.warn("[NvidiaAI] CV retry {}: {}", s.totalRetries() + 1,
                                s.failure().toString())))
                .block();

        try {
            JsonNode root = mapper.readTree(rawResponse);
            NvidiaResponse resp = NvidiaResponse.success(model.modelId, rawResponse);
            resp.rawResponse(root);
            return resp;
        } catch (Exception e) {
            return NvidiaResponse.success(model.modelId, rawResponse);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Embedding models
    // ─────────────────────────────────────────────────────────────────────────

    private NvidiaResponse callEmbedding(NvidiaRequest req) {
        NvidiaModel model = req.getModel();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("model", model.modelId);
        ArrayNode input = payload.putArray("input");
        input.add(req.getTextToEmbed() != null ? req.getTextToEmbed() : req.getUserPrompt());
        payload.put("encoding_format", "float");

        String rawResponse = webClient.post()
                .uri(model.endpoint)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(3))
                        .maxBackoff(Duration.ofSeconds(30))
                        .filter(this::isRetriableNetworkError)
                        .doBeforeRetry(s -> log.warn("[NvidiaAI] Embed retry {}: {}", s.totalRetries() + 1,
                                s.failure().toString())))
                .block();

        try {
            JsonNode root = mapper.readTree(rawResponse);
            JsonNode embeddingNode = root.path("data").get(0).path("embedding");
            java.util.List<Double> embedding = new java.util.ArrayList<>();
            for (JsonNode val : embeddingNode) {
                embedding.add(val.asDouble());
            }
            return NvidiaResponse.success(model.modelId, "embedding_generated")
                    .embedding(embedding);
        } catch (Exception e) {
            log.error("[NvidiaAI] Failed to parse embedding response: {}", e.getMessage());
            return NvidiaResponse.error(model.modelId, "Failed to parse embedding: " + e.getMessage(), 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private NvidiaResponse parseChatCompletionResponse(NvidiaModel model, String rawResponse) {
        try {
            JsonNode root = mapper.readTree(rawResponse);
            String content = root
                    .path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();
            return NvidiaResponse.success(model.modelId, content);
        } catch (Exception e) {
            log.error("[NvidiaAI] Failed to parse chat response from {}: {}", model.modelId, e.getMessage());
            return NvidiaResponse.error(model.modelId, "Parse error: " + e.getMessage(), 500);
        }
    }

    private int resolveMaxTokens(NvidiaRequest req, NvidiaModel model) {
        if (req.getMaxTokens() != null && req.getMaxTokens() > 0)
            return req.getMaxTokens();
        if (model.defaultMaxTokens > 0)
            return model.defaultMaxTokens;
        return 2048;
    }

    /**
     * Reactor timeouts, IO errors, and connection drops — safe to retry once or twice.
     */
    private boolean isRetriableNetworkError(Throwable t) {
        Throwable c = t;
        for (int i = 0; i < 6 && c != null; i++) {
            if (c instanceof TimeoutException || c instanceof SocketTimeoutException)
                return true;
            if (c instanceof IOException)
                return true;
            String name = c.getClass().getName();
            if (name.contains("PrematureCloseException") || name.contains("TimeoutException"))
                return true;
            String msg = c.getMessage();
            if (msg != null && msg.contains("Did not observe any item or terminal signal"))
                return true;
            c = c.getCause();
        }
        return false;
    }
}
