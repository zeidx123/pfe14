package com.example.back_end.service;

import com.example.back_end.model.Administrateur;
import com.example.back_end.model.Agence;
import com.example.back_end.model.ChatMessage;
import com.example.back_end.model.ContratReference;
import com.example.back_end.model.Utilisateur;
import com.example.back_end.repository.AdminRepository;
import com.example.back_end.repository.AgenceRepository;
import com.example.back_end.repository.ChatMessageRepository;
import com.example.back_end.repository.ContratReferenceRepository;
import com.example.back_end.repository.UtilisateurRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final AgenceRepository agenceRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ContratReferenceRepository contratReferenceRepository;
    private final AdminRepository adminRepository;

    public ChatMessageService(ChatMessageRepository chatMessageRepository,
            AgenceRepository agenceRepository,
            UtilisateurRepository utilisateurRepository,
            ContratReferenceRepository contratReferenceRepository,
            AdminRepository adminRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.agenceRepository = agenceRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.contratReferenceRepository = contratReferenceRepository;
        this.adminRepository = adminRepository;
    }

    public ChatMessage sendMessage(ChatMessage message) {
        validateAccess(message);
        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getMessages(String userId, String partnerId) {
        Set<String> userMailboxIds = resolveEquivalentMailboxIds(userId);
        Set<String> partnerMailboxIds = resolveEquivalentMailboxIds(partnerId);

        return chatMessageRepository.findAll().stream()
                .filter(m -> m != null
                        && ((userMailboxIds.contains(m.getSenderId()) && partnerMailboxIds.contains(m.getReceiverId()))
                                ||
                                (partnerMailboxIds.contains(m.getSenderId())
                                        && userMailboxIds.contains(m.getReceiverId()))))
                .sorted(Comparator.comparing(ChatMessage::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    public List<ChatMessage> getAllMyMessages(String userId) {
        Set<String> mailboxIds = resolveEquivalentMailboxIds(userId);

        return chatMessageRepository.findAll().stream()
                .filter(m -> m != null
                        && (mailboxIds.contains(m.getSenderId()) || mailboxIds.contains(m.getReceiverId())))
                .sorted(Comparator.comparing(ChatMessage::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    public List<Interlocutor> getInterlocutors(String userId, String role) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            Map<String, Long> latestAgentActivity = computeLatestPartnerActivity(userId, "AGENT");

            // Admin sees all agencies (unique ids), ordered by latest message activity
            return agenceRepository.findAll().stream()
                    .filter(a -> a.getId() != null && !a.getId().isBlank())
                    .map(a -> new Interlocutor(
                            a.getId(),
                            (a.getNomAgence() != null && !a.getNomAgence().isBlank()) ? a.getNomAgence().trim()
                                    : "Agence",
                            "AGENT"))
                    .collect(Collectors.toMap(
                            i -> i.name == null ? i.id : i.name.trim().toLowerCase(),
                            i -> i,
                            (left, right) -> left))
                    .values().stream()
                    .sorted(Comparator
                            .comparingLong((Interlocutor i) -> latestAgentActivity.getOrDefault(i.id, 0L))
                            .reversed()
                            .thenComparing(i -> i.name == null ? "" : i.name, String.CASE_INSENSITIVE_ORDER))
                    .collect(Collectors.toList());
        } else if ("AGENT".equalsIgnoreCase(role)) {
            // Agent sees all admins + their clients
            Agence agence = agenceRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence not found"));

            Map<String, Long> latestAdminActivity = computeLatestPartnerActivity(userId, "ADMIN");
            List<Interlocutor> result = new ArrayList<>();

            // Add all admins (not only first one), sorted by latest message activity.
            List<Interlocutor> admins = adminRepository.findAll().stream()
                    .filter(admin -> admin.getId() != null && !admin.getId().isBlank())
                    .map(admin -> new Interlocutor(
                            admin.getId(),
                            (admin.getEmail() != null && !admin.getEmail().isBlank())
                                    ? admin.getEmail().split("@")[0]
                                    : "Administrateur Principal",
                            "ADMIN"))
                    .collect(Collectors.toMap(i -> i.id, i -> i, (left, right) -> left))
                    .values().stream()
                    .sorted(Comparator
                            .comparingLong((Interlocutor i) -> latestAdminActivity.getOrDefault(i.id, 0L))
                            .reversed()
                            .thenComparing(i -> i.name == null ? "" : i.name, String.CASE_INSENSITIVE_ORDER))
                    .collect(Collectors.toList());
            result.addAll(admins);

            // Adding Clients that have a contract with this agency
            String nomAgence = agence.getNomAgence();
            List<String> userCins = contratReferenceRepository.findAll().stream()
                    .filter(c -> nomAgence != null && nomAgence.equals(c.getNomAgence()))
                    .map(ContratReference::getCin)
                    .distinct()
                    .collect(Collectors.toList());

            if (!userCins.isEmpty()) {
                utilisateurRepository.findByCinIn(userCins).stream()
                        .filter(u -> u.getId() != null && !u.getId().isBlank())
                        .map(u -> new Interlocutor(
                                u.getId(),
                                (u.getNom() != null && !u.getNom().isBlank()) ? u.getNom() : "Utilisateur",
                                "UTILISATEUR"))
                        .forEach(result::add);
            }
            return result;
        } else if ("UTILISATEUR".equalsIgnoreCase(role)) {
            // Client sees their agency's agent
            Utilisateur user = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur not found"));

            List<ContratReference> contrats = contratReferenceRepository
                    .findByCinOrderByDateFinContratDesc(user.getCin());
            List<String> agenceNames = contrats.stream()
                    .map(ContratReference::getNomAgence)
                    .distinct()
                    .collect(Collectors.toList());

            return agenceRepository.findAll().stream()
                    .filter(a -> agenceNames.contains(a.getNomAgence()))
                    .map(a -> new Interlocutor(a.getId(), a.getNomAgence(), "AGENT"))
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private Map<String, Long> computeLatestPartnerActivity(String currentUserId, String partnerRole) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Collections.emptyMap();
        }

        Map<String, Long> latestByPartner = new HashMap<>();
        List<ChatMessage> allMyMessages = chatMessageRepository
                .findBySenderIdOrReceiverIdOrderByCreatedAt(currentUserId, currentUserId);

        for (ChatMessage message : allMyMessages) {
            if (message == null || message.getCreatedAt() == null) {
                continue;
            }

            String partnerId = null;
            if (currentUserId.equals(message.getSenderId())
                    && partnerRole.equalsIgnoreCase(message.getReceiverRole())) {
                partnerId = message.getReceiverId();
            } else if (currentUserId.equals(message.getReceiverId())
                    && partnerRole.equalsIgnoreCase(message.getSenderRole())) {
                partnerId = message.getSenderId();
            }

            if (partnerId == null || partnerId.isBlank()) {
                continue;
            }

            long timestamp = message.getCreatedAt().toEpochMilli();
            if (timestamp > latestByPartner.getOrDefault(partnerId, 0L)) {
                latestByPartner.put(partnerId, timestamp);
            }
        }

        return latestByPartner;
    }

    private Set<String> resolveEquivalentMailboxIds(String participantId) {
        if (participantId == null || participantId.isBlank()) {
            return Collections.emptySet();
        }

        Set<String> mailboxIds = new HashSet<>();
        mailboxIds.add(participantId);

        agenceRepository.findById(participantId).ifPresent(agence -> {
            String nomAgence = agence.getNomAgence();
            if (nomAgence == null || nomAgence.isBlank()) {
                return;
            }

            String normalizedAgenceName = nomAgence.trim().toLowerCase();
            agenceRepository.findAll().stream()
                    .filter(a -> a.getId() != null && !a.getId().isBlank())
                    .filter(a -> a.getNomAgence() != null && !a.getNomAgence().isBlank())
                    .filter(a -> a.getNomAgence().trim().toLowerCase().equals(normalizedAgenceName))
                    .map(Agence::getId)
                    .forEach(mailboxIds::add);
        });

        return mailboxIds;
    }

    public static class Interlocutor {
        public String id;
        public String name;
        public String role;

        public Interlocutor(String id, String name, String role) {
            this.id = id;
            this.name = name;
            this.role = role;
        }
    }

    private void validateAccess(ChatMessage message) {
        String sRole = message.getSenderRole();
        String rRole = message.getReceiverRole();

        if ("ADMIN".equalsIgnoreCase(sRole) && "AGENT".equalsIgnoreCase(rRole))
            return;
        if ("AGENT".equalsIgnoreCase(sRole) && "ADMIN".equalsIgnoreCase(rRole))
            return;

        if ("AGENT".equalsIgnoreCase(sRole) && "UTILISATEUR".equalsIgnoreCase(rRole)) {
            if (isClientOfAgency(message.getReceiverId(), message.getSenderId()))
                return;
        }
        if ("UTILISATEUR".equalsIgnoreCase(sRole) && "AGENT".equalsIgnoreCase(rRole)) {
            if (isClientOfAgency(message.getSenderId(), message.getReceiverId()))
                return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Communication non autorisée.");
    }

    private boolean isClientOfAgency(String utilisateurId, String agenceId) {
        Optional<Utilisateur> userOpt = utilisateurRepository.findById(utilisateurId);
        Optional<Agence> agenceOpt = agenceRepository.findById(agenceId);
        if (userOpt.isEmpty() || agenceOpt.isEmpty())
            return false;
        String nomA = agenceOpt.get().getNomAgence();
        return contratReferenceRepository.findByCinOrderByDateFinContratDesc(userOpt.get().getCin()).stream()
                .anyMatch(c -> nomA != null && nomA.equals(c.getNomAgence()));
    }
}
