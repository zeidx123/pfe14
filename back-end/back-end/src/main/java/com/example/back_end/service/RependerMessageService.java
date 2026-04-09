package com.example.back_end.service;

import com.example.back_end.dto.RependerMessageRequest;
import com.example.back_end.model.ContactMessage;
import com.example.back_end.model.RependerMessage;
import com.example.back_end.repository.RependerMessageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class RependerMessageService {

    private final RependerMessageRepository rependerMessageRepository;
    private final ContactMessageService contactMessageService;

    public RependerMessageService(RependerMessageRepository rependerMessageRepository,
                                  ContactMessageService contactMessageService) {
        this.rependerMessageRepository = rependerMessageRepository;
        this.contactMessageService = contactMessageService;
    }

    public List<RependerMessage> findByContactMessageId(String requesterEmail, boolean isAdmin, String contactMessageId) {
        assertThreadAccess(requesterEmail, isAdmin, contactMessageId);
        return rependerMessageRepository.findByContactMessageIdOrderByCreatedAtAsc(contactMessageId);
    }

    public RependerMessage createReply(String senderEmail,
                                       boolean isAdmin,
                                       String contactMessageId,
                                       RependerMessageRequest request) {
        assertThreadAccess(senderEmail, isAdmin, contactMessageId);

        if (request == null || !StringUtils.hasText(request.getMessage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply message is required");
        }

        RependerMessage rependerMessage = new RependerMessage();
        rependerMessage.setContactMessageId(contactMessageId);
        rependerMessage.setMessage(request.getMessage().trim());
        rependerMessage.setRepliedBy(senderEmail);
        rependerMessage.setSenderRole(isAdmin ? "ADMIN" : "UTILISATEUR");
        rependerMessage.setCreatedAt(Instant.now());

        return rependerMessageRepository.save(rependerMessage);
    }

    private void assertThreadAccess(String requesterEmail, boolean isAdmin, String contactMessageId) {
        ContactMessage contactMessage = contactMessageService.findByIdOrThrow(contactMessageId);

        if (isAdmin) {
            return;
        }

        if (!StringUtils.hasText(requesterEmail) || !requesterEmail.equalsIgnoreCase(contactMessage.getCreatedBy())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for this conversation");
        }
    }
}
