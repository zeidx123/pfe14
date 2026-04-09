package com.example.back_end.repository;

import com.example.back_end.model.Agence;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AgenceRepository extends MongoRepository<Agence, String> {
}
