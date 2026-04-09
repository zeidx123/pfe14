package com.example.back_end.service;

import com.example.back_end.config.NvidiaProperties;
import com.example.back_end.dto.NvidiaRequest;
import com.example.back_end.dto.NvidiaResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary // Pour remplacer le proxy LangChain4j s'il existe
public class AssurGoAssistantImpl implements AssurGoAssistant {

    private final NvidiaAIService nvidiaService;
    private final NvidiaProperties props;

    public AssurGoAssistantImpl(NvidiaAIService nvidiaService, NvidiaProperties props) {
        this.nvidiaService = nvidiaService;
        this.props = props;
    }

    @Override
    public String chat(String userMessage) {
        NvidiaRequest req = NvidiaRequest.builder()
                .model(props.getDefaultChatModel())
                .systemPrompt("Tu es un agent d'assurance expert et très poli, tu t'appelles AssurGo AI. " +
                        "Ta tâche est de répondre aux questions des clients sur l'assurance, " +
                        "et de déterminer si un sinistre est couvert ou non en te basant sur tes connaissances en tant qu'agent français.")
                .userPrompt(userMessage)
                .temperature(0.3)
                .build();

        NvidiaResponse response = nvidiaService.call(req);
        if (response.isSuccess()) {
            return response.getContent();
        } else {
            return "Désolé, je rencontre une difficulté technique (NVIDIA AI unavailable).";
        }
    }
}
