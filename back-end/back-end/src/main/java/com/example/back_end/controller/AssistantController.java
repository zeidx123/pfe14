package com.example.back_end.controller;

import com.example.back_end.service.AssurGoAssistant;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
@CrossOrigin("*")
public class AssistantController {

    private final AssurGoAssistant assistant;
    private final com.example.back_end.service.OrchestratorAgent orchestratorAgent;

    public AssistantController(AssurGoAssistant assistant,
            com.example.back_end.service.OrchestratorAgent orchestratorAgent) {
        this.assistant = assistant;
        this.orchestratorAgent = orchestratorAgent;
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String message) {
        // Chat Simple
        String response = assistant.chat(message);
        return ResponseEntity.ok(response);
    }

    // NOUVEL ENDPOINT POUR L'ORCHESTRATEUR (RAG + VISION)
    @PostMapping(value = "/claim", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> processClaim(
            @RequestParam("message") String message,
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {

        String response = orchestratorAgent.processClaim(message, image, "", "", "", "assistant-demo");
        return ResponseEntity.ok(response);
    }
}
