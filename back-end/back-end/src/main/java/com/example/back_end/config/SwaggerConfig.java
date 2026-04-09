package com.example.back_end.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger configuration for AssurGo backend.
 *
 * Swagger UI : http://localhost:8080/swagger-ui/index.html
 * OpenAPI JSON: http://localhost:8080/v3/api-docs
 * (Import the JSON URL directly into Postman)
 */
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI assurGoOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("AssurGo API")
                        .description(
                                "API complète du système AssurGo — gestion des sinistres, " +
                                        "contrats, utilisateurs, agences, publications et IA NVIDIA.\n\n" +
                                        "**Pour tester :** Connectez-vous via `POST /api/auth/login`, " +
                                        "copiez le token JWT, cliquez sur **Authorize** et collez-le.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("AssurGo Team")
                                .email("contact@assurgo.com")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Entrez votre token JWT obtenu via /api/auth/login")));
    }
}
