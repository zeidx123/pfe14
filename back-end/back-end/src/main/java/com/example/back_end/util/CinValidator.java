package com.example.back_end.util;

import org.springframework.util.StringUtils;

/**
 * CIN (Carte d'Identité Nationale) validator.
 * CIN must be exactly 8 digits, stored as String in database.
 */
public class CinValidator {

    private static final String CIN_PATTERN = "^\\d{8}$";

    /**
     * Normalize CIN: trim and keep only digits
     */
    public static String normalize(String cin) {
        if (!StringUtils.hasText(cin)) {
            return null;
        }
        return cin.trim().replaceAll("\\D", "");
    }

    /**
     * Validate CIN: must be exactly 8 digits
     */
    public static boolean isValid(String cin) {
        if (!StringUtils.hasText(cin)) {
            return false;
        }
        return cin.matches(CIN_PATTERN);
    }

    /**
     * Validate and normalize CIN in one step
     * Returns normalized CIN if valid, throws exception otherwise
     */
    public static String validateAndNormalize(String cin) {
        String normalized = normalize(cin);
        if (!isValid(normalized)) {
            throw new IllegalArgumentException(
                    "CIN must be exactly 8 digits. Received: " + (cin != null ? cin : "null"));
        }
        return normalized;
    }

    /**
     * Validate CIN (allow null/empty for optional fields)
     * Returns normalized CIN if non-empty and valid, null otherwise
     */
    public static String validateOrNull(String cin) {
        if (!StringUtils.hasText(cin)) {
            return null;
        }
        String normalized = normalize(cin);
        if (!isValid(normalized)) {
            throw new IllegalArgumentException(
                    "CIN must be exactly 8 digits. Received: " + cin);
        }
        return normalized;
    }
}
