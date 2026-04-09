package com.example.back_end.config;

import com.example.back_end.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/agent/login").permitAll()
                        .requestMatchers("/api/agent/**").permitAll()
                        .requestMatchers("/api/chat/**").permitAll()
                        .requestMatchers("/ws/**").permitAll() // WebSocket SockJS endpoint
                        .requestMatchers("/api/assistant/v1/**").permitAll()
                        // Swagger UI & OpenAPI docs — public access for Postman import
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/v3/api-docs").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/publications/**").permitAll()
                        .requestMatchers("/api/publications/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/agences/**").permitAll()
                        .requestMatchers("/api/agences/**").hasRole("ADMIN")
                        .requestMatchers("/api/contrats/**").hasRole("ADMIN")
                        .requestMatchers("/api/contact-messages/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/contact-messages/*/replies/**").hasAnyRole("UTILISATEUR", "ADMIN")
                        .requestMatchers("/api/contact-messages/**").hasAnyRole("UTILISATEUR", "ADMIN")
                        .requestMatchers("/api/utilisateurs/me").hasAnyRole("UTILISATEUR", "ADMIN")
                        .requestMatchers("/api/utilisateurs/**").hasRole("ADMIN")
                        .requestMatchers("/api/sinistres/**").hasAnyRole("UTILISATEUR", "ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/documents/*/download")
                        .permitAll()
                        .requestMatchers("/api/documents/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
