package com.example.back_end.repository;

import com.example.back_end.model.Sinistre;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SinistreRepository extends MongoRepository<Sinistre, String> {
    List<Sinistre> findByCinUtilisateur(String cinUtilisateur);
}
