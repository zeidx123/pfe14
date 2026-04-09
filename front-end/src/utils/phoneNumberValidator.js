import { parsePhoneNumberFromString } from 'libphonenumber-js'

const DEFAULT_COUNTRY = 'TN'

export function validatePhoneNumberOrEmpty(rawPhone) {
  const value = String(rawPhone || '').trim()

  if (!value) {
    return { isValid: true, value: '' }
  }

  const parsed = parsePhoneNumberFromString(value, DEFAULT_COUNTRY)
  if (!parsed || !parsed.isValid()) {
    return {
      isValid: false,
      value,
      error: 'Numero de telephone invalide.'
    }
  }

  return {
    isValid: true,
    value: parsed.number
  }
}
