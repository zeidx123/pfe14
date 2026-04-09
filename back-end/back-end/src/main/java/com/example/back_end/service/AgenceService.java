package com.example.back_end.service;

import com.example.back_end.model.Agence;
import com.example.back_end.repository.AgenceRepository;
import com.example.back_end.util.PhoneNumberValidator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AgenceService {

    private final AgenceRepository agenceRepository;

    public AgenceService(AgenceRepository agenceRepository) {
        this.agenceRepository = agenceRepository;
    }

    public List<Agence> findAll() {
        return agenceRepository.findAll();
    }

    public Agence findById(String id) {
        return agenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));
    }

    public Agence create(Agence request) {
        if (!StringUtils.hasText(request.getVille())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La ville est obligatoire");
        }
        Agence agence = new Agence();
        applyFields(agence, request);
        return agenceRepository.save(agence);
    }

    public Agence update(String id, Agence request) {
        Agence agence = agenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));
        if (!StringUtils.hasText(request.getVille())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La ville est obligatoire");
        }
        applyFields(agence, request);
        return agenceRepository.save(agence);
    }

    public void delete(String id) {
        if (!agenceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée");
        }
        agenceRepository.deleteById(id);
    }

    private void applyFields(Agence target, Agence source) {
        target.setNomAgence(source.getNomAgence() != null ? source.getNomAgence().trim() : null);
        target.setVille(source.getVille() != null ? source.getVille().trim() : null);
        target.setAdresse(source.getAdresse());
        try {
            target.setTelephone(PhoneNumberValidator.validateOrNull(source.getTelephone()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telephone invalide: " + e.getMessage());
        }
        target.setHoraires(source.getHoraires());
        target.setSotadmin(source.getSotadmin());
        target.setEmailSotadmin(source.getEmailSotadmin());
        // Only update password if a new one is provided
        if (source.getPassword() != null && !source.getPassword().isBlank()) {
            target.setPassword(source.getPassword());
        }
        target.setRoleSotadmin(source.getRoleSotadmin());
    }
}
