package com.example.back_end.service;

import com.example.back_end.dto.LoginRequest;
import com.example.back_end.dto.LoginResponse;
import com.example.back_end.dto.UtilisateurRegisterRequest;
import com.example.back_end.dto.UtilisateurRegisterResponse;
import com.example.back_end.model.Administrateur;
import com.example.back_end.model.StatutCompte;
import com.example.back_end.model.Utilisateur;
import com.example.back_end.repository.AdminRepository;
import com.example.back_end.repository.ContratReferenceRepository;
import com.example.back_end.repository.UtilisateurRepository;
import com.example.back_end.security.JwtService;
import com.example.back_end.util.CinValidator;
import com.example.back_end.util.PhoneNumberValidator;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern CIN_PATTERN = Pattern.compile("^\\d{8}$");

    private final AdminRepository adminRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ContratReferenceRepository contratReferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AdminRepository adminRepository,
            UtilisateurRepository utilisateurRepository,
            ContratReferenceRepository contratReferenceRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.adminRepository = adminRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.contratReferenceRepository = contratReferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Administrateur admin = adminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(admin.getEmail(), admin.getRole(), admin.getId());
        return new LoginResponse(token, admin.getId(), admin.getRole(), "Administrateur principal");
    }

    public UtilisateurRegisterResponse registerUtilisateur(UtilisateurRegisterRequest request) {
        System.out.println("--- DEBUG: DEBUT INSCRIPTION ---");
        String nom = request.getNom() == null ? "" : request.getNom().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword().trim();
        String telephone;
        try {
            telephone = PhoneNumberValidator.validateOrNull(request.getTelephone());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telephone invalide: " + e.getMessage());
        }
        String cin = normalizeCin(request.getCin());

        if (!StringUtils.hasText(nom) || !StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            System.out.println("DEBUG: Champs obligatoires manquants.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom, email et mot de passe sont obligatoires");
        }

        if (utilisateurRepository.existsByEmail(email)) {
            System.out.println("DEBUG: L'email existe deja : " + email);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        try {
            Utilisateur utilisateur = new Utilisateur();
            utilisateur.setNom(nom);
            utilisateur.setEmail(email);
            utilisateur.setPassword(passwordEncoder.encode(password));
            utilisateur.setTelephone(telephone);
            utilisateur.setCin(StringUtils.hasText(cin) ? cin : null);
            utilisateur.setRole("UTILISATEUR");

            boolean isVerified = StringUtils.hasText(cin)
                    && contratReferenceRepository.existsByCinAndDateFinContratGreaterThanEqual(cin, LocalDate.now());
            utilisateur.setStatutCompte(isVerified ? StatutCompte.VERIFIE : StatutCompte.NON_VERIFIE);

            System.out.println("DEBUG: Tentative de sauvegarde MongoDB pour " + email);
            Utilisateur savedUtilisateur = utilisateurRepository.save(utilisateur);
            System.out.println("DEBUG: Inscription réussie ! ID=" + savedUtilisateur.getId());
            return toRegisterResponse(savedUtilisateur);
        } catch (Exception e) {
            System.out.println("DEBUG ERROR: Exception lors de la creation du compte !");
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors du save: " + e.getMessage());
        }
    }

    public LoginResponse loginUtilisateur(LoginRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), utilisateur.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Ensure CIN is valid (8 digits) if present
        if (StringUtils.hasText(utilisateur.getCin()) && !CinValidator.isValid(utilisateur.getCin())) {
            utilisateur.setCin(null); // Reset invalid CIN
            utilisateurRepository.save(utilisateur);
        }

        boolean isVerified = StringUtils.hasText(utilisateur.getCin())
                && contratReferenceRepository.existsByCinAndDateFinContratGreaterThanEqual(
                        utilisateur.getCin(),
                        LocalDate.now());
        StatutCompte computedStatut = isVerified ? StatutCompte.VERIFIE : StatutCompte.NON_VERIFIE;
        if (utilisateur.getStatutCompte() != computedStatut) {
            utilisateur.setStatutCompte(computedStatut);
            utilisateurRepository.save(utilisateur);
        }

        String token = jwtService.generateToken(utilisateur.getEmail(), utilisateur.getRole(), utilisateur.getId());
        return new LoginResponse(token, utilisateur.getId(), utilisateur.getRole(), utilisateur.getNom());
    }

    private UtilisateurRegisterResponse toRegisterResponse(Utilisateur utilisateur) {
        UtilisateurRegisterResponse response = new UtilisateurRegisterResponse();
        response.setId(utilisateur.getId());
        response.setNom(utilisateur.getNom());
        response.setEmail(utilisateur.getEmail());
        response.setTelephone(utilisateur.getTelephone());
        response.setCin(utilisateur.getCin());
        response.setRole(utilisateur.getRole());
        response.setStatutCompte(utilisateur.getStatutCompte());
        return response;
    }

    private String normalizeCin(String rawCin) {
        if (!StringUtils.hasText(rawCin)) {
            return "";
        }

        String normalized = rawCin.trim().replaceAll("\\D", "");
        if (!CIN_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN doit contenir exactement 8 chiffres");
        }
        return normalized;
    }

}
