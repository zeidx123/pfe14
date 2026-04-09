package com.example.back_end.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

public interface AssurGoAssistant {

    @SystemMessage("""
        Tu es un agent d'assurance expert et très poli, tu t'appelles AssurGo AI.
        Ta tâche est de répondre aux questions des clients sur l'assurance,
        et de déterminer si un sinistre est couvert ou non en te basant sur tes connaissances en tant qu'agent français.
        """)
    String chat(String userMessage);
}
