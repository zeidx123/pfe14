package com.example.back_end.controller;

import com.example.back_end.dto.LoginRequest;
import com.example.back_end.dto.LoginResponse;
import com.example.back_end.dto.UtilisateurRegisterRequest;
import com.example.back_end.dto.UtilisateurRegisterResponse;
import com.example.back_end.service.AuthService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/utilisateur/register")
    public UtilisateurRegisterResponse registerUtilisateur(@RequestBody UtilisateurRegisterRequest request) {
        return authService.registerUtilisateur(request);
    }

    @PostMapping("/utilisateur/login")
    public LoginResponse loginUtilisateur(@RequestBody LoginRequest request) {
        return authService.loginUtilisateur(request);
    }
}
