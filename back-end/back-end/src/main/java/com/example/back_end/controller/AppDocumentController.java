package com.example.back_end.controller;

import com.example.back_end.model.AppDocument;
import com.example.back_end.repository.AppDocumentRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin("*")
public class AppDocumentController {

    private final AppDocumentRepository repository;

    public AppDocumentController(AppDocumentRepository repository) {
        this.repository = repository;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addDocument(
            @RequestParam("typeDocument") String typeDocument,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Le fichier est obligatoire.");
            }
            if (!"application/pdf".equalsIgnoreCase(file.getContentType())) {
                return ResponseEntity.badRequest().body("Fichier invalide, seul le format PDF est accepté.");
            }
            if (typeDocument == null || typeDocument.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Le type de document est obligatoire.");
            }

            AppDocument doc = new AppDocument();
            doc.setTypeDocument(typeDocument);
            doc.setDateCreation(LocalDate.now());
            doc.setFileName(file.getOriginalFilename());
            doc.setContentType(file.getContentType());
            doc.setData(file.getBytes());

            AppDocument saved = repository.save(doc);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<AppDocument>> getAllDocuments() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateDocument(
            @PathVariable String id,
            @RequestParam("typeDocument") String typeDocument,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            Optional<AppDocument> existingOpt = repository.findById(id);
            if (!existingOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            if (typeDocument == null || typeDocument.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Le type de document est obligatoire.");
            }

            AppDocument doc = existingOpt.get();
            doc.setTypeDocument(typeDocument);

            if (file != null && !file.isEmpty()) {
                if (!"application/pdf".equalsIgnoreCase(file.getContentType())) {
                    return ResponseEntity.badRequest().body("Fichier invalide, seul le format PDF est accepté.");
                }
                doc.setFileName(file.getOriginalFilename());
                doc.setContentType(file.getContentType());
                doc.setData(file.getBytes());
            }

            AppDocument saved = repository.save(doc);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable String id) {
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable String id) {
        Optional<AppDocument> docOpt = repository.findById(id);
        if (!docOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        AppDocument doc = docOpt.get();
        if (doc.getData() == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(doc.getData());
    }
}
