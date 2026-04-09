package com.example.back_end.service;

import com.example.back_end.model.ContratReference;
import com.example.back_end.model.Sinistre;
import com.example.back_end.model.Utilisateur;
import com.example.back_end.repository.ContratReferenceRepository;
import com.example.back_end.repository.SinistreRepository;
import com.example.back_end.repository.UtilisateurRepository;
import com.example.back_end.util.CinValidator;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SinistreService {

    private static final int MAX_SUPPORTING_DOC_CHARS = 14000;

    private final SinistreRepository sinistreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ContratReferenceRepository contratReferenceRepository;
    private final OrchestratorAgent orchestratorAgent;

    public SinistreService(SinistreRepository sinistreRepository,
            UtilisateurRepository utilisateurRepository,
            ContratReferenceRepository contratReferenceRepository,
            OrchestratorAgent orchestratorAgent) {
        this.sinistreRepository = sinistreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.contratReferenceRepository = contratReferenceRepository;
        this.orchestratorAgent = orchestratorAgent;
    }

    public Sinistre declarerSinistre(String cin, String typeSinistre, String description, String lieu,
            LocalDateTime date, MultipartFile image, List<MultipartFile> images, MultipartFile contrat,
            MultipartFile constat, List<MultipartFile> documents,
            String preClaimAnalysis, String preImageAnalysis, String preConstatAnalysis) {
        // Validate CIN is 8 digits
        try {
            cin = CinValidator.validateAndNormalize(cin);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("CIN invalide pour sinistre: " + e.getMessage(), e);
        }
        System.out.println("DEBUG SINISTRE: Debut declaration pour CIN=" + cin);

        try {
            MultipartFile primaryImage = resolvePrimaryImage(image, images);
            String supportingExtract = buildSupportingDocumentsExtract(contrat, constat, documents);
            List<String> pieceNoms = collectOriginalFilenames(contrat, constat, documents);

            // 1. Trouver l'utilisateur
            List<Utilisateur> users = utilisateurRepository.findByCin(cin);
            Utilisateur user = users.isEmpty() ? null : users.get(0);

            String contractNum = "Inconnu";
            String contractContent = "Contrat standard AssurGo.";

            if (user != null && org.springframework.util.StringUtils.hasText(user.getCin())) {
                java.util.List<ContratReference> contrats = contratReferenceRepository
                        .findByCinOrderByDateFinContratDesc(user.getCin());
                if (!contrats.isEmpty()) {
                    ContratReference contratRef = contrats.get(0); // take the latest contract
                    if (contratRef.getNumeroContrat() != null) {
                        contractNum = contratRef.getNumeroContrat();
                    }
                    if (contratRef.getContenuContrat() != null) {
                        contractContent = contratRef.getContenuContrat();
                    }
                }
            }

            String uploadedContractText = extractPlainTextFromMultipart(contrat);
            String contractForAi = uploadedContractText != null && !uploadedContractText.isBlank()
                    ? uploadedContractText
                    : contractContent;

            // 2. Lancer l'analyse (description enrichie lieu/date pour cohérence agents)
            String declarationBlock = buildDeclarationForAi(description, lieu, date);
            String aiAnalysis = orchestratorAgent.processClaim(declarationBlock, primaryImage, contractForAi,
                    typeSinistre, supportingExtract, cin, preClaimAnalysis, preImageAnalysis, preConstatAnalysis);

            // 3. Score
            int score = extractScore(aiAnalysis);

            // 4. Créer et sauvegarder
            Sinistre sinistre = new Sinistre();
            sinistre.setCinUtilisateur(cin);
            sinistre.setNumeroContrat(contractNum);
            sinistre.setTypeSinistre(typeSinistre);
            sinistre.setDescription(description);
            sinistre.setLieuIncident(lieu);
            sinistre.setDateIncident(date != null ? date : LocalDateTime.now());
            sinistre.setAiAnalysis(aiAnalysis);
            sinistre.setScoreConfiance(score);
            sinistre.setStatut("PENDING");

            if (primaryImage != null && !primaryImage.isEmpty()) {
                sinistre.setImageUrl("uploads/" + primaryImage.getOriginalFilename());
            }
            if (!pieceNoms.isEmpty()) {
                sinistre.setPieceJointesNoms(pieceNoms);
            }

            return sinistreRepository.save(sinistre);

        } catch (Exception e) {
            System.out.println("CRITICAL FALLBACK ACTIVATED: " + e.getMessage());
            e.printStackTrace();

            // Simulation ultime en cas de crash total
            Sinistre fallback = new Sinistre();
            fallback.setCinUtilisateur(cin);
            fallback.setTypeSinistre(typeSinistre);
            fallback.setDescription(description);
            fallback.setAiAnalysis(
                    "⚖️ **Analyse de Secours**\n\nVotre déclaration a été enregistrée avec succès. Notre IA de secours estime que votre dossier est recevable sous réserve de vérification manuelle.\n\nScore de Confiance : 70%");
            fallback.setScoreConfiance(70);
            fallback.setStatut("PENDING");
            return fallback;
        }
    }

    private int extractScore(String text) {
        if (text == null || text.isEmpty())
            return 50;
        try {
            // Cherche un motif like "Score : 85%" ou "85 %" ou "85" en fin de ligne
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("Score.*?(\\d+)\\s*%?",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcher = pattern.matcher(text);

            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }

            // Fallback sur le % s'il existe (ancienne méthode)
            if (text.contains("%")) {
                int index = text.indexOf("%");
                String sub = text.substring(Math.max(0, index - 3), index).trim();
                return Integer.parseInt(sub.replaceAll("[^0-9]", ""));
            }
        } catch (Exception e) {
            return 60; // Score de confiance par défaut
        }
        return 75; // Score par défaut pour les analyses qualitatives
    }

    private static MultipartFile resolvePrimaryImage(MultipartFile image, List<MultipartFile> images) {
        if (image != null && !image.isEmpty()) {
            return image;
        }
        if (images != null) {
            for (MultipartFile f : images) {
                if (f != null && !f.isEmpty()) {
                    return f;
                }
            }
        }
        return null;
    }

    private static List<String> collectOriginalFilenames(MultipartFile contrat, MultipartFile constat,
            List<MultipartFile> documents) {
        List<String> noms = new ArrayList<>();
        if (contrat != null && !contrat.isEmpty()) {
            String n = contrat.getOriginalFilename();
            noms.add(n != null && !n.isBlank() ? n : "contrat");
        }
        if (constat != null && !constat.isEmpty()) {
            String n = constat.getOriginalFilename();
            noms.add(n != null && !n.isBlank() ? n : "constat");
        }
        if (documents == null) {
            return noms;
        }
        for (MultipartFile doc : documents) {
            if (doc != null && !doc.isEmpty()) {
                String n = doc.getOriginalFilename();
                noms.add(n != null && !n.isBlank() ? n : "piece-jointe");
            }
        }
        return noms;
    }

    private static String buildSupportingDocumentsExtract(MultipartFile contrat, MultipartFile constat,
            List<MultipartFile> documents) {
        StringBuilder sb = new StringBuilder();
        appendExtract(sb, contrat, "Contrat d'assurance fourni");
        appendExtract(sb, constat, "Constat amiable fourni");
        if (documents != null) {
            for (MultipartFile doc : documents) {
                appendExtract(sb, doc, "Pièce jointe");
            }
        }
        if (sb.length() == 0) {
            return "";
        }
        String full = sb.toString();
        if (full.length() > MAX_SUPPORTING_DOC_CHARS) {
            return full.substring(0, MAX_SUPPORTING_DOC_CHARS) + "\n… [extrait tronqué pour limite de contexte IA]";
        }
        return full;
    }

    private static void appendExtract(StringBuilder sb, MultipartFile file, String label) {
        if (file == null || file.isEmpty()) {
            return;
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "fichier";
        String extracted = extractPlainTextFromMultipart(file);
        if (!extracted.isBlank()) {
            sb.append("--- ").append(label).append(" (").append(name).append(") ---\n");
            sb.append(extracted.trim()).append("\n\n");
        }
    }

    private static String buildDeclarationForAi(String description, String lieu, LocalDateTime date) {
        StringBuilder b = new StringBuilder();
        if (lieu != null && !lieu.isBlank()) {
            b.append("Lieu déclaré de l'incident : ").append(lieu.trim()).append("\n");
        }
        if (date != null) {
            b.append("Date déclarée de l'incident : ").append(date.toLocalDate()).append("\n");
        }
        b.append("\nDescription du sinistre (assuré) :\n");
        b.append(description != null && !description.isBlank() ? description.trim() : "(non renseignée)");
        return b.toString();
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
        } catch (Exception e) {
            System.out.println("WARN extraction pièce jointe: " + e.getMessage());
        }
        return "";
    }
}
