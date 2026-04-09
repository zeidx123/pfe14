package com.example.back_end.controller;

import com.example.back_end.dto.UpdateStatutRequest;
import com.example.back_end.model.ContratReference;
import com.example.back_end.service.ContratReferenceService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/contrats")
@CrossOrigin("*")
public class ContratReferenceController {

    private final ContratReferenceService contratReferenceService;

    public ContratReferenceController(ContratReferenceService contratReferenceService) {
        this.contratReferenceService = contratReferenceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContratReference create(@RequestBody ContratReference request) {
        return contratReferenceService.create(request);
    }

    @PutMapping("/{id}")
    public ContratReference update(@PathVariable String id, @RequestBody ContratReference request) {
        return contratReferenceService.update(id, request);
    }

    @PatchMapping("/{id}/statut")
    public ContratReference updateStatut(@PathVariable String id, @RequestBody UpdateStatutRequest request) {
        return contratReferenceService.updateStatut(id, request.getStatut());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        contratReferenceService.delete(id);
    }

    @GetMapping
    public List<ContratReference> findAll() {
        return contratReferenceService.findAll();
    }
}
