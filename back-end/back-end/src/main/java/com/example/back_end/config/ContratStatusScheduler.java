package com.example.back_end.config;

import com.example.back_end.service.ContratReferenceService;
import com.example.back_end.service.UtilisateurService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ContratStatusScheduler {

    private final ContratReferenceService contratReferenceService;
    private final UtilisateurService utilisateurService;

    public ContratStatusScheduler(ContratReferenceService contratReferenceService,
                                  UtilisateurService utilisateurService) {
        this.contratReferenceService = contratReferenceService;
        this.utilisateurService = utilisateurService;
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void updateExpiredContractsStatus() {
        contratReferenceService.refreshExpiredStatuses();
        utilisateurService.synchronizeAllStatutComptes();
    }
}
