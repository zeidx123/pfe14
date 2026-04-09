package com.example.back_end.service;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentParser;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class DocumentIngestionService {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    // Injection du modèle d'embedding (BGE) et du vector store (en mémoire)
    public DocumentIngestionService(EmbeddingModel embeddingModel, EmbeddingStore<TextSegment> embeddingStore) {
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
    }

    // @PostConstruct pour que l'ingestion se lance automatiquement au démarrage de l'app Spring Boot
    @PostConstruct
    public void init() {
        System.out.println("=================================================");
        System.out.println("🔧 Démarrage de l'ingestion des documents PDF...");
        
        // Dossier contenant les contrats d'assurance
        Path documentsPath = Paths.get("src/main/resources/documents");
        
        try {
            if (!Files.exists(documentsPath)) {
                Files.createDirectories(documentsPath);
                System.out.println("📁 Dossier créé : " + documentsPath.toAbsolutePath());
                System.out.println("⚠️ Veuillez placer vos contrats PDF dans ce dossier !");
                System.out.println("=================================================");
                return;
            }
        } catch (IOException e) {
            System.err.println("❌ Impossible de créer le dossier : " + e.getMessage());
            return;
        }

        // Liste pour stocker tous les documents
        List<Document> allDocuments = new java.util.ArrayList<>();

        // 1. Lire les documents PDF
        DocumentParser pdfParser = new ApachePdfBoxDocumentParser();
        try {
            List<Document> pdfDocs = FileSystemDocumentLoader.loadDocuments(documentsPath, new java.nio.file.PathMatcher() {
                @Override
                public boolean matches(Path path) {
                    return path.toString().toLowerCase().endsWith(".pdf");
                }
            }, pdfParser);
            allDocuments.addAll(pdfDocs);
        } catch (Exception e) {
            System.out.println("⚠️ Pas de PDF trouvés ou erreur de lecture: " + e.getMessage());
        }

        // 2. Lire les documents TXT (pour nos tests rapides)
        dev.langchain4j.data.document.parser.TextDocumentParser txtParser = new dev.langchain4j.data.document.parser.TextDocumentParser();
        try {
            List<Document> txtDocs = FileSystemDocumentLoader.loadDocuments(documentsPath, new java.nio.file.PathMatcher() {
                @Override
                public boolean matches(Path path) {
                    return path.toString().toLowerCase().endsWith(".txt");
                }
            }, txtParser);
            allDocuments.addAll(txtDocs);
        } catch (Exception e) {
            System.out.println("⚠️ Pas de TXT trouvés ou erreur de lecture: " + e.getMessage());
        }

        if (allDocuments.isEmpty()) {
            System.out.println("⚠️ Aucun document trouvé. Placez des PDF ou TXT dans : " + documentsPath.toAbsolutePath());
            System.out.println("=================================================");
            return;
        }

        System.out.println("📚 " + allDocuments.size() + " document(s) trouvé(s). Découpage et Vectorisation en cours...");

        // Configuration de l'ingestor qui lit, découpe et enregistre dans la base RAG
        EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                .documentSplitter(DocumentSplitters.recursive(500, 50)) // On coupe les textes en passages (taille 500 caractères, chevauchement 50)
                .embeddingModel(embeddingModel) // Modèle BGE que vous avez configuré
                .embeddingStore(embeddingStore) // Base In-Memory que vous avez configurée
                .build();

        // Lancement de l'intégration dans l'Espace Vectoriel
        ingestor.ingest(allDocuments);

        System.out.println("✅ Ingestion terminée ! L'Assistant est prêt à lire les contrats.");
        System.out.println("=================================================");
    }
}
