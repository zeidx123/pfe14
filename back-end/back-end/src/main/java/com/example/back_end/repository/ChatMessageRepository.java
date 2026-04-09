package com.example.back_end.repository;

import com.example.back_end.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByCreatedAt(
            String s1, String r1, String s2, String r2);
            
    List<ChatMessage> findBySenderIdOrReceiverIdOrderByCreatedAt(String senderId, String receiverId);
}
