package com.example.back_end.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "sinistres")
public class Sinistre {

    @Id
    private String id;
    private String cinUtilisateur;
    private String numeroContrat;
    private String typeSinistre; // Nom de la catégorie identifiée (Bris de glace, Accident, etc.)
    private String description;
    private LocalDateTime dateIncident;
    private String lieuIncident;
    private String statut; // PENDING, APPROVED, REJECTED
    private String aiAnalysis; // Synthèse de l'Orchestrateur
    private int scoreConfiance;
    private String imageUrl;
    /** Noms des fichiers documents joints à la déclaration */
    private List<String> pieceJointesNoms;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCinUtilisateur() {
        return cinUtilisateur;
    }

    public void setCinUtilisateur(String cinUtilisateur) {
        this.cinUtilisateur = cinUtilisateur;
    }

    public String getNumeroContrat() {
        return numeroContrat;
    }

    public void setNumeroContrat(String numeroContrat) {
        this.numeroContrat = numeroContrat;
    }

    public String getTypeSinistre() {
        return typeSinistre;
    }

    public void setTypeSinistre(String typeSinistre) {
        this.typeSinistre = typeSinistre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getDateIncident() {
        return dateIncident;
    }

    public void setDateIncident(LocalDateTime dateIncident) {
        this.dateIncident = dateIncident;
    }

    public String getLieuIncident() {
        return lieuIncident;
    }

    public void setLieuIncident(String lieuIncident) {
        this.lieuIncident = lieuIncident;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getAiAnalysis() {
        return aiAnalysis;
    }

    public void setAiAnalysis(String aiAnalysis) {
        this.aiAnalysis = aiAnalysis;
    }

    public int getScoreConfiance() {
        return scoreConfiance;
    }

    public void setScoreConfiance(int scoreConfiance) {
        this.scoreConfiance = scoreConfiance;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public List<String> getPieceJointesNoms() {
        return pieceJointesNoms;
    }

    public void setPieceJointesNoms(List<String> pieceJointesNoms) {
        this.pieceJointesNoms = pieceJointesNoms;
    }
}
