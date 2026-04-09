package com.example.back_end.service;

import com.example.back_end.model.ContratReference;
import com.example.back_end.repository.ContratReferenceRepository;
import com.example.back_end.util.CinValidator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class ContratReferenceService {

    private final ContratReferenceRepository contratReferenceRepository;
    private final UtilisateurService utilisateurService;

    public ContratReferenceService(ContratReferenceRepository contratReferenceRepository,
                                   UtilisateurService utilisateurService) {
        this.contratReferenceRepository = contratReferenceRepository;
        this.utilisateurService = utilisateurService;
    }

    public ContratReference create(ContratReference request) {
        // Validate CIN is 8 digits
        try {
            String normalizedCin = CinValidator.validateAndNormalize(request.getCin());
            request.setCin(normalizedCin);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN invalide pour contrat: " + e.getMessage());
        }

        validateUniqueNumeroContrat(request.getNumeroContrat(), null);

        ContratReference contrat = new ContratReference();
        applyEditableFields(contrat, request);
        contrat.setStatut(calculateStatut(contrat.getDateFinContrat()));
        ContratReference savedContrat = contratReferenceRepository.save(contrat);
        utilisateurService.synchronizeStatutCompteByCin(savedContrat.getCin());
        return savedContrat;
    }

    public ContratReference update(String id, ContratReference request) {
        ContratReference contrat = contratReferenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat not found"));

        String previousCin = contrat.getCin();

        // Validate CIN is 8 digits
        try {
            String normalizedCin = CinValidator.validateAndNormalize(request.getCin());
            request.setCin(normalizedCin);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN invalide pour contrat: " + e.getMessage());
        }

        validateUniqueNumeroContrat(request.getNumeroContrat(), id);

        applyEditableFields(contrat, request);
        contrat.setStatut(calculateStatut(contrat.getDateFinContrat()));
        ContratReference savedContrat = contratReferenceRepository.save(contrat);

        utilisateurService.synchronizeStatutCompteByCin(previousCin);
        utilisateurService.synchronizeStatutCompteByCin(savedContrat.getCin());

        return savedContrat;
    }

    public void delete(String id) {
        ContratReference contrat = contratReferenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat not found"));

        contratReferenceRepository.deleteById(id);
        utilisateurService.synchronizeStatutCompteByCin(contrat.getCin());
    }

    public ContratReference updateStatut(String id, String statut) {
        ContratReference contrat = contratReferenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat not found"));

        if (statut == null || statut.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Statut is required");
        }

        contrat.setStatut(statut.trim().toUpperCase());
        ContratReference savedContrat = contratReferenceRepository.save(contrat);
        utilisateurService.synchronizeStatutCompteByCin(savedContrat.getCin());
        return savedContrat;
    }

    public List<ContratReference> findAll() {
        refreshExpiredStatuses();
        return contratReferenceRepository.findAll();
    }

    public void refreshExpiredStatuses() {
        List<ContratReference> expiredContrats =
                contratReferenceRepository.findByDateFinContratBeforeAndStatutNot(LocalDate.now(), "DESACTIVE");

        if (!expiredContrats.isEmpty()) {
            for (ContratReference contrat : expiredContrats) {
                contrat.setStatut("DESACTIVE");
            }
            contratReferenceRepository.saveAll(expiredContrats);

            expiredContrats.stream()
                    .map(ContratReference::getCin)
                    .distinct()
                    .forEach(utilisateurService::synchronizeStatutCompteByCin);
        }
    }

    private void applyEditableFields(ContratReference target, ContratReference source) {
        if (source.getNomAgence() != null) target.setNomAgence(source.getNomAgence());
        target.setCin(source.getCin());
        target.setNumeroContrat(source.getNumeroContrat());
        target.setCodeContrat(source.getCodeContrat());
        target.setTypeContrat(source.getTypeContrat());
        target.setDateDebutContrat(source.getDateDebutContrat());
        target.setDateFinContrat(source.getDateFinContrat());
        target.setFichier(source.getFichier());
    }

    private String calculateStatut(LocalDate dateFinContrat) {
        if (dateFinContrat == null) {
            return "DESACTIVE";
        }
        return !dateFinContrat.isBefore(LocalDate.now()) ? "ACTIF" : "DESACTIVE";
    }

    private void validateUniqueNumeroContrat(String numeroContrat, String currentContratId) {
        if (!StringUtils.hasText(numeroContrat)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numero contrat is required");
        }

        String normalizedNumeroContrat = numeroContrat.trim();
        ContratReference existing = contratReferenceRepository.findByNumeroContrat(normalizedNumeroContrat)
                .orElse(null);

        if (existing != null && (currentContratId == null || !existing.getId().equals(currentContratId))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Numero contrat already exists");
        }
    }
}
