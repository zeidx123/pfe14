package com.example.back_end.repository;

import com.example.back_end.model.Administrateur;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AdminRepository extends MongoRepository<Administrateur, String> {
    Optional<Administrateur> findByEmail(String email);
}
