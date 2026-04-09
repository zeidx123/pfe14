package com.example.back_end.dto;

public class LoginResponse {
    private String token;
    private String id;
    private String role;
    private String nom;

    public LoginResponse(String token) {
        this.token = token;
    }

    public LoginResponse(String token, String id, String role, String nom) {
        this.token = token;
        this.id = id;
        this.role = role;
        this.nom = nom;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }
}
