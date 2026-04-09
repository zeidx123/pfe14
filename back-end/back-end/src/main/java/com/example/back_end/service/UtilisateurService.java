package com.example.back_end.service;

import com.example.back_end.dto.AdminUtilisateurResponse;
import com.example.back_end.dto.UtilisateurContratResponse;
import com.example.back_end.dto.UtilisateurProfileResponse;
import com.example.back_end.dto.UpdateUtilisateurRequest;
import com.example.back_end.model.ContratReference;
import com.example.back_end.model.StatutCompte;
import com.example.back_end.model.Utilisateur;
import com.example.back_end.repository.ContratReferenceRepository;
import com.example.back_end.repository.UtilisateurRepository;
import com.example.back_end.util.CinValidator;
import com.example.back_end.util.PhoneNumberValidator;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UtilisateurService {

    private static final Pattern CIN_PATTERN = Pattern.compile("^\\d{8}$");

    private final UtilisateurRepository utilisateurRepository;
    private final ContratReferenceRepository contratReferenceRepository;
    private final PasswordEncoder passwordEncoder;

    public UtilisateurService(UtilisateurRepository utilisateurRepository,
            ContratReferenceRepository contratReferenceRepository,
            PasswordEncoder passwordEncoder) {
        this.utilisateurRepository = utilisateurRepository;
        this.contratReferenceRepository = contratReferenceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UtilisateurProfileResponse getProfileByEmail(String email) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur not found"));
        utilisateur = synchronizeStatutCompte(utilisateur);
        return toProfileResponse(utilisateur);
    }

    public List<AdminUtilisateurResponse> findAllForAdmin() {
        return utilisateurRepository.findAll().stream()
                .map(this::synchronizeStatutCompte)
                .map(this::toAdminResponse)
                .collect(Collectors.toList());
    }

    public List<AdminUtilisateurResponse> findUsersByAgenceName(String nomAgence) {
        if (!StringUtils.hasText(nomAgence)) return Collections.emptyList();
        
        List<String> cins = contratReferenceRepository.findAll().stream()
                .filter(c -> nomAgence.equals(c.getNomAgence()))
                .map(ContratReference::getCin)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
                
        if (cins.isEmpty()) return Collections.emptyList();
        
        return utilisateurRepository.findByCinIn(cins).stream()
                .map(this::synchronizeStatutCompte)
                .map(this::toAdminResponse)
                .collect(Collectors.toList());
    }

    public UtilisateurProfileResponse updateProfileByEmail(String email, UpdateUtilisateurRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur not found"));

        validateEmailUniqueness(request.getEmail(), utilisateur.getId());

        utilisateur.setNom(normalizeValue(request.getNom()));
        utilisateur.setEmail(normalizeValue(request.getEmail()));
        try {
            utilisateur.setTelephone(PhoneNumberValidator.validateOrNull(request.getTelephone()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telephone invalide: " + e.getMessage());
        }
        try {
            utilisateur.setCin(CinValidator.validateOrNull(request.getCin()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN invalide: " + e.getMessage());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            utilisateur.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        utilisateur.setStatutCompte(computeStatutCompteForCin(utilisateur.getCin()));

        Utilisateur savedUtilisateur = utilisateurRepository.save(utilisateur);
        return toProfileResponse(savedUtilisateur);
    }

    public Utilisateur update(String id, UpdateUtilisateurRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur not found"));

        validateEmailUniqueness(request.getEmail(), utilisateur.getId());

        utilisateur.setNom(normalizeValue(request.getNom()));
        utilisateur.setEmail(normalizeValue(request.getEmail()));
        try {
            utilisateur.setTelephone(PhoneNumberValidator.validateOrNull(request.getTelephone()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telephone invalide: " + e.getMessage());
        }
        try {
            utilisateur.setCin(CinValidator.validateOrNull(request.getCin()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN invalide: " + e.getMessage());
        }
        utilisateur.setRole("UTILISATEUR");

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            utilisateur.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        if (request.getStatutCompte() != null) {
            utilisateur.setStatutCompte(request.getStatutCompte());
        } else {
            utilisateur.setStatutCompte(computeStatutCompteForCin(utilisateur.getCin()));
        }

        return utilisateurRepository.save(utilisateur);
    }

    public void delete(String id) {
        if (!utilisateurRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur not found");
        }
        utilisateurRepository.deleteById(id);
    }

    public void synchronizeStatutCompteByCin(String cin) {
        if (!StringUtils.hasText(cin)) {
            return;
        }

        String normalizedCin = normalizeCinLoose(cin);
        if (!StringUtils.hasText(normalizedCin)) {
            return;
        }
        StatutCompte computedStatut = computeStatutCompteForCin(normalizedCin);

        List<Utilisateur> utilisateurs = utilisateurRepository.findByCin(normalizedCin);
        if (utilisateurs.isEmpty()) {
            return;
        }

        Utilisateur utilisateur = utilisateurs.get(0);
        if (!Objects.equals(utilisateur.getStatutCompte(), computedStatut)) {
            utilisateur.setStatutCompte(computedStatut);
            utilisateurRepository.save(utilisateur);
        }
    }

    public void synchronizeAllStatutComptes() {
        List<Utilisateur> utilisateurs = utilisateurRepository.findAll();
        if (utilisateurs.isEmpty()) {
            return;
        }

        List<Utilisateur> updates = new ArrayList<>();
        for (Utilisateur utilisateur : utilisateurs) {
            StatutCompte computedStatut = computeStatutCompteForCin(utilisateur.getCin());
            if (!Objects.equals(utilisateur.getStatutCompte(), computedStatut)) {
                utilisateur.setStatutCompte(computedStatut);
                updates.add(utilisateur);
            }
        }

        if (!updates.isEmpty()) {
            utilisateurRepository.saveAll(updates);
        }
    }

    private UtilisateurProfileResponse toProfileResponse(Utilisateur utilisateur) {
        List<UtilisateurContratResponse> contrats = Collections.emptyList();
        if (StringUtils.hasText(utilisateur.getCin())) {
            contrats = contratReferenceRepository.findByCinOrderByDateFinContratDesc(utilisateur.getCin())
                    .stream()
                    .map(this::toContratResponse)
                    .collect(Collectors.toList());
        }

        UtilisateurProfileResponse response = new UtilisateurProfileResponse();
        response.setId(utilisateur.getId());
        response.setNom(utilisateur.getNom());
        response.setEmail(utilisateur.getEmail());
        response.setTelephone(utilisateur.getTelephone());
        response.setCin(utilisateur.getCin());
        response.setRole(utilisateur.getRole());
        response.setStatutCompte(utilisateur.getStatutCompte());
        response.setNombreContrats(contrats.size());
        response.setContrats(contrats);
        return response;
    }

    private UtilisateurContratResponse toContratResponse(ContratReference contrat) {
        UtilisateurContratResponse response = new UtilisateurContratResponse();
        response.setNumeroContrat(contrat.getNumeroContrat());
        response.setNomAgence(contrat.getNomAgence());
        response.setTypeContrat(contrat.getTypeContrat());
        response.setStatut(contrat.getStatut());
        response.setDateFinContrat(contrat.getDateFinContrat());
        response.setFichier(contrat.getFichier());
        return response;
    }

    private AdminUtilisateurResponse toAdminResponse(Utilisateur utilisateur) {
        AdminUtilisateurResponse response = new AdminUtilisateurResponse();
        response.setId(utilisateur.getId());
        response.setNom(utilisateur.getNom());
        response.setEmail(utilisateur.getEmail());
        response.setTelephone(utilisateur.getTelephone());
        response.setCin(utilisateur.getCin());
        response.setRole(utilisateur.getRole());
        response.setStatutCompte(utilisateur.getStatutCompte());
        return response;
    }

    private Utilisateur synchronizeStatutCompte(Utilisateur utilisateur) {
        StatutCompte computedStatut = computeStatutCompteForCin(utilisateur.getCin());

        if (Objects.equals(utilisateur.getStatutCompte(), computedStatut)) {
            return utilisateur;
        }

        utilisateur.setStatutCompte(computedStatut);
        return utilisateurRepository.save(utilisateur);
    }

    private StatutCompte computeStatutCompteForCin(String cin) {
        if (!StringUtils.hasText(cin)) {
            return StatutCompte.NON_VERIFIE;
        }

        // Ensure CIN is valid (8 digits)
        if (!CinValidator.isValid(cin)) {
            return StatutCompte.NON_VERIFIE; // Invalid CIN => not verified
        }

        // VERIFIE si au moins un contrat ACTIF existe pour ce CIN
        boolean hasActiveContrat = contratReferenceRepository
                .existsByCinAndDateFinContratGreaterThanEqual(cin, LocalDate.now());

        return hasActiveContrat ? StatutCompte.VERIFIE : StatutCompte.NON_VERIFIE;
    }

    private void validateEmailUniqueness(String email, String currentUserId) {
        String normalizedEmail = normalizeValue(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email utilisateur obligatoire.");
        }

        utilisateurRepository.findByEmail(normalizedEmail)
                .filter(existingUser -> !Objects.equals(existingUser.getId(), currentUserId))
                .ifPresent(existingUser -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
                });
    }

    private String normalizeValue(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalizeCinStrict(String cin) {
        if (!StringUtils.hasText(cin)) {
            return null;
        }

        String normalized = cin.trim().replaceAll("\\D", "");
        if (!CIN_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN doit contenir exactement 8 chiffres");
        }
        return normalized;
    }

    private String normalizeCinLoose(String cin) {
        if (!StringUtils.hasText(cin)) {
            return null;
        }

        String normalized = cin.trim().replaceAll("\\D", "");
        return CIN_PATTERN.matcher(normalized).matches() ? normalized : null;
    }
}
