package com.example.back_end.controller;

import com.example.back_end.dto.ContactMessageRequest;
import com.example.back_end.dto.RependerMessageRequest;
import com.example.back_end.model.ContactMessage;
import com.example.back_end.model.RependerMessage;
import com.example.back_end.service.ContactMessageService;
import com.example.back_end.service.RependerMessageService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/contact-messages")
public class ContactMessageController {

    private final ContactMessageService contactMessageService;
    private final RependerMessageService rependerMessageService;

    public ContactMessageController(ContactMessageService contactMessageService,
                                    RependerMessageService rependerMessageService) {
        this.contactMessageService = contactMessageService;
        this.rependerMessageService = rependerMessageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactMessage create(Authentication authentication, @RequestBody ContactMessageRequest request) {
        return contactMessageService.create(authentication.getName(), request);
    }

    @GetMapping("/admin")
    public List<ContactMessage> findAllForAdmin() {
        return contactMessageService.findAllForAdmin();
    }

    @GetMapping("/mine")
    public List<ContactMessage> findMine(Authentication authentication) {
        return contactMessageService.findMine(authentication.getName());
    }

    @GetMapping("/{contactMessageId}/replies")
    public List<RependerMessage> findReplies(Authentication authentication,
                                             @PathVariable String contactMessageId) {
        return rependerMessageService.findByContactMessageId(
                authentication.getName(),
                isAdmin(authentication),
                contactMessageId
        );
    }

    @PostMapping("/{contactMessageId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public RependerMessage createReply(Authentication authentication,
                                       @PathVariable String contactMessageId,
                                       @RequestBody RependerMessageRequest request) {
        return rependerMessageService.createReply(
                authentication.getName(),
                isAdmin(authentication),
                contactMessageId,
                request
        );
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }
}
