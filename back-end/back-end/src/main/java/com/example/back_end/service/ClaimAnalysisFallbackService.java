package com.example.back_end.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * When NVIDIA APIs time out or fail, produces orchestrator-shaped JSON so the
 * front-end still shows a consistent, professional result (MANUAL_REVIEW).
 */
@Service
public class ClaimAnalysisFallbackService {

    private static final Pattern SUSPICIOUS = Pattern.compile(
            "western union|bitcoin|virement immédiat|crypto-wallet|doubler l'indemn|sans déclaration préalable",
            Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;

    public ClaimAnalysisFallbackService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String buildFallbackOrchestratorJson(String claimDescription, String claimType,
            String claimAnalysisContentOrNull, String imageAnalysisContentOrNull, String technicalNote) {
        String desc = claimDescription != null ? claimDescription : "";
        String type = claimType != null ? claimType : "AUTO";
        boolean suspicious = SUSPICIOUS.matcher(desc).find();
        boolean hasImageAnalysis = StringUtils.hasText(imageAnalysisContentOrNull)
                && !"{}".equals(imageAnalysisContentOrNull.trim());

        double confidence = 0.62;
        String fraud = "LOW";
        if (suspicious) {
            fraud = "MEDIUM";
            confidence = 0.48;
        } else if (hasImageAnalysis) {
            confidence = 0.68;
        }

        Double indemn = null;
        Double coveragePct = 0.82;
        if (StringUtils.hasText(claimAnalysisContentOrNull)) {
            try {
                JsonNode n = objectMapper.readTree(sanitizeJsonCandidate(claimAnalysisContentOrNull));
                if (n.has("estimatedMaxAmount") && n.get("estimatedMaxAmount").isNumber()) {
                    indemn = n.get("estimatedMaxAmount").asDouble();
                } else if (n.has("estimatedMinAmount") && n.get("estimatedMinAmount").isNumber()) {
                    indemn = n.get("estimatedMinAmount").asDouble();
                }
                if (n.has("confidenceScore") && n.get("confidenceScore").isNumber()) {
                    confidence = Math.min(0.85, Math.max(0.4, n.get("confidenceScore").asDouble()));
                }
            } catch (Exception ignored) {
                // keep defaults
            }
        }

        ObjectNode root = objectMapper.createObjectNode();
        root.put("finalDecision", "MANUAL_REVIEW");
        root.put("globalConfidenceScore", round2(confidence));
        if (indemn != null && indemn > 0) {
            root.put("finalIndemnificationAmount", indemn);
        } else {
            root.putNull("finalIndemnificationAmount");
        }
        root.put("currency", "TND");
        root.put("coveragePercentageApplied", round2(coveragePct));
        root.put("deductibleApplied", 0);

        ObjectNode notif = objectMapper.createObjectNode();
        notif.put("subject", "Votre déclaration AssurGo — examen en cours");
        notif.put("body", buildInsuredBody(type, desc, technicalNote));

        root.set("insuredNotification", notif);
        String audit = "Analyse cloud NVIDIA indisponible ou incomplète (timeout / réseau). "
                + "Révision humaine obligatoire. ";
        if (StringUtils.hasText(technicalNote)) {
            audit += technicalNote;
        }
        root.put("internalAuditNote", audit);
        root.put("fraudRiskLevel", fraud);

        ObjectNode weights = objectMapper.createObjectNode();
        weights.put("claimAnalysisWeight", 0.6);
        weights.put("imageAnalysisWeight", 0.4);
        root.set("agentWeights", weights);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return minimalJsonFallback();
        }
    }

    private static String sanitizeJsonCandidate(String raw) {
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```json\\s*", "").replaceFirst("^```\\s*", "");
            s = s.replaceFirst("```\\s*$", "").trim();
        }
        return s;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static String buildInsuredBody(String claimType, String description, String technicalNote) {
        String shortDesc = description.length() > 280 ? description.substring(0, 277) + "…" : description;
        StringBuilder b = new StringBuilder();
        b.append("Bonjour,\n\n");
        b.append("Nous avons bien enregistré votre déclaration");
        if (StringUtils.hasText(claimType)) {
            b.append(" (type : ").append(labelType(claimType)).append(")");
        }
        b.append(".\n\n");
        if (StringUtils.hasText(shortDesc)) {
            b.append("Résumé de votre signalement : ").append(shortDesc).append("\n\n");
        }
        b.append("Votre dossier est pris en charge. L'analyse automatique n'a pas pu être finalisée "
                + "entièrement depuis nos serveurs d'IA (liaison ou délai), ce qui est fréquent en charge. "
                + "Un expert AssurGo analysera votre dossier sous peu et vous contactera.\n\n");
        b.append("Merci de conserver vos pièces justificatives (photos, factures) en votre possession.\n\n");
        b.append("— L'équipe AssurGo");
        if (StringUtils.hasText(technicalNote) && technicalNote.length() < 120) {
            b.append("\n\n[Réf. technique : ").append(technicalNote).append("]");
        }
        return b.toString();
    }

    private static String labelType(String t) {
        return switch (t.toUpperCase(Locale.ROOT)) {
            case "AUTO" -> "automobile";
            case "HABITATION" -> "habitation";
            case "VOYAGE" -> "voyage";
            case "PREVOYANCE" -> "prévoyance";
            default -> t;
        };
    }

    private String minimalJsonFallback() {
        return "{\"finalDecision\":\"MANUAL_REVIEW\",\"globalConfidenceScore\":0.6,"
                + "\"finalIndemnificationAmount\":null,\"currency\":\"TND\","
                + "\"coveragePercentageApplied\":0.8,\"deductibleApplied\":0,"
                + "\"insuredNotification\":{\"subject\":\"Déclaration enregistrée\",\"body\":\"Votre dossier sera traité par un agent.\"},"
                + "\"internalAuditNote\":\"Fallback minimal\",\"fraudRiskLevel\":\"LOW\","
                + "\"agentWeights\":{\"claimAnalysisWeight\":0.6,\"imageAnalysisWeight\":0.4}}";
    }
}
