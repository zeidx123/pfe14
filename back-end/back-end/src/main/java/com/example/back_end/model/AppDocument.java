package com.example.back_end.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Document(collection = "documents")
public class AppDocument {

    @Id
    private String id;
    
    // "voiture", "habitation", "voyage", "prévoyance"
    private String typeDocument;
    
    private LocalDate dateCreation;
    
    private String fileName;
    private String contentType;
    
    @JsonIgnore
    private byte[] data;

    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }
    public String getTypeDocument() {
        return typeDocument;
    }
    public void setTypeDocument(String typeDocument) {
        this.typeDocument = typeDocument;
    }
    public LocalDate getDateCreation() {
        return dateCreation;
    }
    public void setDateCreation(LocalDate dateCreation) {
        this.dateCreation = dateCreation;
    }
    public String getFileName() {
        return fileName;
    }
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    public String getContentType() {
        return contentType;
    }
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    public byte[] getData() {
        return data;
    }
    public void setData(byte[] data) {
        this.data = data;
    }
}
