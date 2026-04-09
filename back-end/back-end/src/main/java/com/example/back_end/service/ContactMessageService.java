package com.example.back_end.service;

import com.example.back_end.dto.ContactMessageRequest;
import com.example.back_end.model.ContactMessage;
import com.example.back_end.repository.ContactMessageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class ContactMessageService {

    private final ContactMessageRepository contactMessageRepository;

    public ContactMessageService(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    public ContactMessage create(String authenticatedEmail, ContactMessageRequest request) {
        validateRequest(request);

        ContactMessage contactMessage = new ContactMessage();
        contactMessage.setNom(request.getNom().trim());
        contactMessage.setEmail(request.getEmail().trim());
        contactMessage.setSujet(request.getSujet().trim());
        contactMessage.setMessage(request.getMessage().trim());
        contactMessage.setCreatedBy(authenticatedEmail);
        contactMessage.setCreatedAt(Instant.now());

        return contactMessageRepository.save(contactMessage);
    }

    public List<ContactMessage> findAllForAdmin() {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ContactMessage> findMine(String authenticatedEmail) {
        return contactMessageRepository.findByCreatedByOrderByCreatedAtDesc(authenticatedEmail);
    }

    public ContactMessage findByIdOrThrow(String id) {
        return contactMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact message not found"));
    }

    private void validateRequest(ContactMessageRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        if (!StringUtils.hasText(request.getNom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom is required");
        }

        if (!StringUtils.hasText(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (!StringUtils.hasText(request.getSujet())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sujet is required");
        }

        if (!StringUtils.hasText(request.getMessage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
    }
}
