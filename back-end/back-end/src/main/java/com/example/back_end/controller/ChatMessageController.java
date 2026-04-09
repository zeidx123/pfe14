package com.example.back_end.controller;

import com.example.back_end.model.ChatMessage;
import com.example.back_end.service.ChatMessageService;
import com.example.back_end.service.ChatMessageService.Interlocutor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin("*")
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageController(ChatMessageService chatMessageService,
            SimpMessagingTemplate messagingTemplate) {
        this.chatMessageService = chatMessageService;
        this.messagingTemplate = messagingTemplate;
    }

    // ─── Endpoint REST (existant, gardé pour la compatibilité) ────────────────

    @PostMapping("/send")
    public ChatMessage sendMessageRest(@RequestBody ChatMessage message) {
        ChatMessage saved = chatMessageService.sendMessage(message);
        // Notifier en temps réel les deux participants via WebSocket
        notifyParticipants(saved);
        return saved;
    }

    @GetMapping("/conversation/{userId}/{partnerId}")
    public List<ChatMessage> getConversation(@PathVariable String userId, @PathVariable String partnerId) {
        return chatMessageService.getMessages(userId, partnerId);
    }

    @GetMapping("/interlocutors/{userId}/{role}")
    public List<Interlocutor> getInterlocutors(@PathVariable String userId, @PathVariable String role) {
        return chatMessageService.getInterlocutors(userId, role);
    }

    @GetMapping("/all-my-messages/{userId}")
    public List<ChatMessage> getAllMyMessages(@PathVariable String userId) {
        return chatMessageService.getAllMyMessages(userId);
    }

    // ─── Endpoint WebSocket STOMP ─────────────────────────────────────────────

    /**
     * Reçoit un message via WebSocket (client publie sur /app/chat.send)
     * et le diffuse en temps réel à l'expéditeur et au destinataire.
     */
    @MessageMapping("/chat.send")
    public void sendMessageWs(@Payload ChatMessage message) {
        ChatMessage saved = chatMessageService.sendMessage(message);
        notifyParticipants(saved);
    }

    // ─── Méthode utilitaire ───────────────────────────────────────────────────

    private void notifyParticipants(ChatMessage message) {
        if (message.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(
                    message.getReceiverId(), "/queue/messages", message);
        }
        if (message.getSenderId() != null) {
            messagingTemplate.convertAndSendToUser(
                    message.getSenderId(), "/queue/messages", message);
        }
    }
}
