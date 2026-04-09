package com.example.back_end.config;

import com.example.back_end.service.AssurGoAssistant;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.service.AiServices;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    public AssurGoAssistant assurGoAssistant(ChatLanguageModel chatLanguageModel, dev.langchain4j.rag.content.retriever.ContentRetriever contentRetriever) {
        return AiServices.builder(AssurGoAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemory(MessageWindowChatMemory.withMaxMessages(20))
                .contentRetriever(contentRetriever)
                .build();
    }
}
