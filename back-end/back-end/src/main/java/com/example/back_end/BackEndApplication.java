package com.example.back_end;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class BackEndApplication {

	public static void main(String[] args) {
		loadDotEnvIfPresent();
		SpringApplication.run(BackEndApplication.class, args);
	}

	/**
	 * Permet d'utiliser {@code back-end/.env} (ex. NVIDIA_API_KEY=...) pour le dev local.
	 * Les variables d'environnement réelles restent prioritaires.
	 */
	private static void loadDotEnvIfPresent() {
		try {
			Dotenv dotenv = Dotenv.configure()
					.directory(".")
					.ignoreIfMissing()
					.load();
			dotenv.entries().forEach(e -> {
				String key = e.getKey();
				if (System.getenv(key) == null && System.getProperty(key) == null) {
					System.setProperty(key, e.getValue());
				}
			});
		} catch (Exception ignored) {
			// .env facultatif
		}
	}

}
