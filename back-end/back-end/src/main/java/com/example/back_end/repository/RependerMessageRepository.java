package com.example.back_end.repository;

import com.example.back_end.model.RependerMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RependerMessageRepository extends MongoRepository<RependerMessage, String> {
    List<RependerMessage> findByContactMessageIdOrderByCreatedAtAsc(String contactMessageId);
}
