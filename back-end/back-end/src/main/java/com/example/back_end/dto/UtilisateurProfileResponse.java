package com.example.back_end.dto;

import com.example.back_end.model.StatutCompte;

import java.util.List;

public class UtilisateurProfileResponse {
    private String id;
    private String nom;
    private String email;
    private String telephone;
    private String cin;
    private String role;
    private StatutCompte statutCompte;
    private int nombreContrats;
    private List<UtilisateurContratResponse> contrats;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getCin() {
        return cin;
    }

    public void setCin(String cin) {
        this.cin = cin;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public StatutCompte getStatutCompte() {
        return statutCompte;
    }

    public void setStatutCompte(StatutCompte statutCompte) {
        this.statutCompte = statutCompte;
    }

    public int getNombreContrats() {
        return nombreContrats;
    }

    public void setNombreContrats(int nombreContrats) {
        this.nombreContrats = nombreContrats;
    }

    public List<UtilisateurContratResponse> getContrats() {
        return contrats;
    }

    public void setContrats(List<UtilisateurContratResponse> contrats) {
        this.contrats = contrats;
    }
}