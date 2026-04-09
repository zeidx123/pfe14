package com.example.back_end.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface InsuranceAssistant {

    @SystemMessage("""
        Tu es un agent d'assurance expert et très poli (Validator Agent).
        Ta tâche est de répondre aux questions des clients sur l'assurance,
        et de déterminer si un sinistre est couvert ou non en de basant sur les règles.
        """)
    String chat(String userMessage);
}
