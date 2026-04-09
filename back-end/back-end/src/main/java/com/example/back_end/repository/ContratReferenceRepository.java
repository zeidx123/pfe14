package com.example.back_end.repository;

import com.example.back_end.model.ContratReference;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContratReferenceRepository extends MongoRepository<ContratReference, String> {
	List<ContratReference> findByDateFinContratBeforeAndStatutNot(LocalDate date, String statut);
	List<ContratReference> findByCinOrderByDateFinContratDesc(String cin);
	Optional<ContratReference> findByNumeroContrat(String numeroContrat);
	boolean existsByCinAndNumeroContratAndStatut(String cin, String numeroContrat, String statut);
	boolean existsByCinAndDateFinContratGreaterThanEqual(String cin, LocalDate date);
}
