package com.example.back_end.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.springframework.util.StringUtils;

/**
 * Phone validator based on Google libphonenumber.
 * Normalizes valid numbers to E.164 format (example: +21612345678).
 */
public class PhoneNumberValidator {

    private static final String DEFAULT_REGION = "TN";
    private static final PhoneNumberUtil PHONE_UTIL = PhoneNumberUtil.getInstance();

    private PhoneNumberValidator() {
        // Utility class
    }

    public static String validateOrNull(String rawPhone) {
        if (!StringUtils.hasText(rawPhone)) {
            return null;
        }

        String candidate = rawPhone.trim();
        try {
            Phonenumber.PhoneNumber parsed = PHONE_UTIL.parse(candidate, DEFAULT_REGION);
            if (!PHONE_UTIL.isValidNumber(parsed)) {
                throw new IllegalArgumentException("Numero de telephone invalide");
            }
            return PHONE_UTIL.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException ex) {
            throw new IllegalArgumentException("Numero de telephone invalide", ex);
        }
    }
}
 