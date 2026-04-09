package com.example.back_end.controller;

import com.example.back_end.dto.AdminUtilisateurResponse;
import com.example.back_end.dto.UtilisateurProfileResponse;
import com.example.back_end.dto.UpdateUtilisateurRequest;
import com.example.back_end.service.UtilisateurService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin("*")
public class UtilisateurController {
    // Endpoint temporaire pour forcer la synchronisation de tous les statuts utilisateurs
    @PutMapping("/sync-statut")
    public void synchronizeAllStatutComptes() {
        utilisateurService.synchronizeAllStatutComptes();
    }

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    @GetMapping("/me")
    public UtilisateurProfileResponse me(Authentication authentication) {
        return utilisateurService.getProfileByEmail(authentication.getName());
    }

    @PutMapping("/me")
    public UtilisateurProfileResponse updateMe(Authentication authentication,
            @RequestBody UpdateUtilisateurRequest request) {
        return utilisateurService.updateProfileByEmail(authentication.getName(), request);
    }

    @GetMapping
    public List<AdminUtilisateurResponse> findAll() {
        return utilisateurService.findAllForAdmin();
    }

}
