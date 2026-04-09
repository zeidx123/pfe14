package com.example.back_end.repository;

import com.example.back_end.model.ContactMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ContactMessageRepository extends MongoRepository<ContactMessage, String> {
	List<ContactMessage> findAllByOrderByCreatedAtDesc();
    List<ContactMessage> findByCreatedByOrderByCreatedAtDesc(String createdBy);
}
