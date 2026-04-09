package com.example.back_end.service;

import com.example.back_end.config.NvidiaModel;
import com.example.back_end.dto.NvidiaRequest;
import com.example.back_end.dto.NvidiaResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.Base64;

@Service
public class EstimatorAgent {

    private final NvidiaAIService nvidiaService;

    public EstimatorAgent(NvidiaAIService nvidiaService) {
        this.nvidiaService = nvidiaService;
    }

    /**
     * Analyse l'image du sinistre et renvoie une description précise des dommages.
     * Utilise désormais NVIDIA NIM (LLaMA 3.2 Vision) au lieu d'OpenAI.
     */
    public String analyzeDamage(MultipartFile imageFile, String userDescription) {
        try {
            // 1. Convertir l'image en Base64
            byte[] imageBytes = imageFile.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            // 2. Préparer le prompt
            String prompt = """
                    Tu es un expert en assurance automobile.
                    Analyse cette image de véhicule accidenté avec la plus grande précision.
                    Description fournie par le client: "%s"

                    Décris:
                    1. Les éléments du véhicule endommagés (ex: pare-chocs, phare, carrosserie).
                    2. La gravité des dommages (légers, moyens, graves).
                    3. Le coût estimé de la réparation sur une échelle de 1 à 10.
                    Sois bref et très factuel. Appuie-toi visuellement sur la photo.
                    """.formatted(userDescription != null ? userDescription : "Aucune");

            // 3. Appel NVIDIA
            NvidiaResponse response = nvidiaService.call(NvidiaRequest.builder()
                    .model(NvidiaModel.LLAMA_3_2_90B_VISION)
                    .userPrompt(prompt)
                    .imageBase64(base64Image, imageFile.getContentType())
                    .temperature(0.10)
                    .build());

            if (response.isSuccess()) {
                return response.getContent();
            } else {
                return "Note: Analyse visuelle indisponible (NVIDIA Error: " + response.getErrorMessage() + ")";
            }

        } catch (Exception e) {
            return "Erreur lors de l'extraction de l'image : " + e.getMessage();
        }
    }
}
