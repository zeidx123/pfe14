package com.example.back_end.controller;

import com.example.back_end.model.Agence;
import com.example.back_end.model.ContratReference;
import com.example.back_end.dto.AdminUtilisateurResponse;
import com.example.back_end.dto.UpdateUtilisateurRequest;
import com.example.back_end.repository.AgenceRepository;
import com.example.back_end.service.ContratReferenceService;
import com.example.back_end.service.UtilisateurService;
import com.example.back_end.util.PhoneNumberValidator;
import com.example.back_end.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin("*")
public class AgentController {

    private final AgenceRepository agenceRepository;
    private final ContratReferenceService contratReferenceService;
    private final UtilisateurService utilisateurService;
    private final JwtService jwtService;

    public AgentController(AgenceRepository agenceRepository,
            ContratReferenceService contratReferenceService,
            UtilisateurService utilisateurService,
            JwtService jwtService) {
        this.agenceRepository = agenceRepository;
        this.contratReferenceService = contratReferenceService;
        this.utilisateurService = utilisateurService;
        this.jwtService = jwtService;
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public Map<String, Object> loginAgent(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email et mot de passe requis");
        }

        Optional<Agence> found = agenceRepository.findAll()
                .stream()
                .filter(a -> email.equalsIgnoreCase(a.getEmailSotadmin())
                        && password.equals(a.getPassword()))
                .findFirst();

        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou mot de passe invalide.");
        }

        Agence agence = found.get();
        String nom = agence.getSotadmin() != null ? agence.getSotadmin() : agence.getNomAgence();

        // Use real JWT token for Agent
        String token = jwtService.generateToken(agence.getEmailSotadmin(), "AGENT", agence.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("role", "AGENT");
        response.put("id", agence.getId());
        response.put("agenceId", agence.getId());
        response.put("nomAgence", agence.getNomAgence());
        response.put("nom", nom);
        return response;
    }

    // ─── Agence ───────────────────────────────────────────────────────────────

    @GetMapping("/agence/{id}")
    public Agence getMyAgence(@PathVariable String id) {
        return agenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));
    }

    @PutMapping("/agence/{id}")
    public Agence updateMyAgence(@PathVariable String id, @RequestBody Agence request) {
        Agence agence = agenceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));

        if (request.getNomAgence() != null)
            agence.setNomAgence(request.getNomAgence().trim());
        if (request.getVille() != null)
            agence.setVille(request.getVille().trim());
        agence.setAdresse(request.getAdresse());
        try {
            agence.setTelephone(PhoneNumberValidator.validateOrNull(request.getTelephone()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telephone invalide: " + e.getMessage());
        }
        agence.setHoraires(request.getHoraires());
        agence.setSotadmin(request.getSotadmin());
        if (request.getEmailSotadmin() != null)
            agence.setEmailSotadmin(request.getEmailSotadmin());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            agence.setPassword(request.getPassword());
        }
        return agenceRepository.save(agence);
    }

    // ─── Contrats (filtered by agent's agency name) ───────────────────────────

    @GetMapping("/contrats/{agenceId}")
    public List<ContratReference> getMyContrats(@PathVariable String agenceId) {
        Agence agence = agenceRepository.findById(agenceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));
        String nomAgence = agence.getNomAgence();
        return contratReferenceService.findAll().stream()
                .filter(c -> nomAgence != null && nomAgence.equals(c.getNomAgence()))
                .collect(Collectors.toList());
    }

    @PostMapping("/contrats")
    @ResponseStatus(HttpStatus.CREATED)
    public ContratReference createContrat(@RequestBody ContratReference request) {
        return contratReferenceService.create(request);
    }

    @PutMapping("/contrats/{id}")
    public ContratReference updateContrat(@PathVariable String id, @RequestBody ContratReference request) {
        return contratReferenceService.update(id, request);
    }

    @DeleteMapping("/contrats/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteContrat(@PathVariable String id) {
        contratReferenceService.delete(id);
    }

    // ─── Utilisateurs (filtered by agent's agency name)
    // ───────────────────────────

    @GetMapping("/utilisateurs/{agenceId}")
    public List<AdminUtilisateurResponse> getMyUsers(@PathVariable String agenceId) {
        Agence agence = agenceRepository.findById(agenceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence non trouvée"));
        return utilisateurService.findUsersByAgenceName(agence.getNomAgence());
    }

    @PutMapping("/utilisateurs/{id}")
    public void updateMyUser(@PathVariable String id, @RequestBody UpdateUtilisateurRequest request) {
        utilisateurService.update(id, request);
    }

    @DeleteMapping("/utilisateurs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyUser(@PathVariable String id) {
        utilisateurService.delete(id);
    }
}
