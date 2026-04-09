package com.example.back_end.repository;

import com.example.back_end.model.AppDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppDocumentRepository extends MongoRepository<AppDocument, String> {
}
