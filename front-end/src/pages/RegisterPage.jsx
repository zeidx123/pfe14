import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { validatePhoneNumberOrEmpty } from '../utils/phoneNumberValidator'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    telephone: '',
    cin: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    let processedValue = value

    // Sanitize CIN: digits only, max 8 characters
    if (name === 'cin') {
      processedValue = value.replace(/\D/g, '').slice(0, 8)
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.nom.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Veuillez remplir nom, email et mot de passe.')
      return
    }

    const phoneCheck = validatePhoneNumberOrEmpty(formData.telephone)
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/utilisateur/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          telephone: phoneCheck.value,
          cin: formData.cin.trim()
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de créer le compte.')
      }

      setSuccess('Compte créé avec succès. Redirection vers la connexion...')
      setTimeout(() => {
        navigate('/se-connecter')
      }, 1000)
    } catch (submitError) {
      setError(submitError.message || 'Erreur lors de la création du compte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{t('auth.register.title')}</h1>
        <p>{t('auth.register.subtitle')}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t('auth.register.nom')} *
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder={t('auth.register.nom')}
              required
            />
          </label>
          <label>
            {t('auth.register.email')} *
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
            />
          </label>
          <label>
            {t('auth.register.password')} *
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
              required
            />
          </label>
          <label>
            {t('telephone') || 'Téléphone'}
            <input
              type="text"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="Votre numéro de téléphone"
              inputMode="tel"
            />
          </label>
          <label>
            CIN
            <input
              type="text"
              name="cin"
              value={formData.cin}
              onChange={handleChange}
              placeholder="Votre CIN (8 chiffres)"
              inputMode="numeric"
              maxLength="8"
              pattern="\d{8}"
              title="CIN doit contenir exactement 8 chiffres"
            />
          </label>
          {error ? <p className="auth-switch">{error}</p> : null}
          {success ? <p className="auth-switch">{success}</p> : null}
          <button type="submit" className="primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.register.submit') : t('auth.register.button')}
          </button>
        </form>
        <p className="auth-switch">
          {t('auth.register.hasAccount')} <Link to="/se-connecter">{t('auth.register.login')}</Link>
        </p>
      </section>
    </main>
  )
}
