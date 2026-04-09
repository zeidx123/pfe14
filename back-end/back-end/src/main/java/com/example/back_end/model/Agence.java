package com.example.back_end.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "agences")
public class Agence {

    @Id
    private String id;
    private String nomAgence;
    private String ville;
    private String adresse;
    private String telephone;
    private String horaires;

    private String sotadmin; // nom ou identifiant de l'acteur
    private String emailSotadmin; // email du sotadmin
    private String password; // mot de passe du sotadmin
    private String roleSotadmin; // rôle du sotadmin

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNomAgence() {
        return nomAgence;
    }

    public void setNomAgence(String nomAgence) {
        this.nomAgence = nomAgence;
    }

    public String getVille() {
        return ville;
    }

    public void setVille(String ville) {
        this.ville = ville;
    }

    public String getAdresse() {
        return adresse;
    }

    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getHoraires() {
        return horaires;
    }

    public void setHoraires(String horaires) {
        this.horaires = horaires;
    }

    public String getSotadmin() {
        return sotadmin;
    }

    public void setSotadmin(String sotadmin) {
        this.sotadmin = sotadmin;
    }

    public String getEmailSotadmin() {
        return emailSotadmin;
    }

    public void setEmailSotadmin(String emailSotadmin) {
        this.emailSotadmin = emailSotadmin;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRoleSotadmin() {
        return roleSotadmin;
    }

    public void setRoleSotadmin(String roleSotadmin) {
        this.roleSotadmin = roleSotadmin;
    }
}
