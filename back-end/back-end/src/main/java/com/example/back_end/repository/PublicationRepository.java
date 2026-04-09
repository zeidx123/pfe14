package com.example.back_end.repository;

import com.example.back_end.model.Publication;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PublicationRepository extends MongoRepository<Publication, String> {
    List<Publication> findByALaUneTrue();
    List<Publication> findAllByOrderByDatePublicationDesc();
}
