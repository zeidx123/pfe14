import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const normalizeRole = (role) => {
  if (!role) {
    return null
  }

  const normalized = role.toString().trim().toUpperCase()
  return normalized.startsWith('ROLE_') ? normalized.replace('ROLE_', '') : normalized
}

const decodeRoleFromToken = (token) => {
  try {
    const payload = token?.split('.')[1]
    if (!payload) {
      return null
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    )
    const decodedPayload = JSON.parse(atob(paddedPayload))
    return normalizeRole(decodedPayload?.role)
  } catch {
    return null
  }
}

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Veuillez remplir email et mot de passe.')
      return
    }

    setIsSubmitting(true)

    try {
      const loginEndpoints = [
        { url: '/api/auth/login', role: 'ADMIN' },
        { url: '/api/auth/utilisateur/login', role: 'UTILISATEUR' },
        { url: '/api/agent/login', role: 'AGENT' }
      ]

      let data = null
      let matchedRole = null
      let lastErrorMessage = 'Email ou mot de passe invalide.'

      for (const endpoint of loginEndpoints) {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        const responseData = await response.json().catch(() => null)

        if (response.ok) {
          data = responseData
          matchedRole = endpoint.role
          break
        }

        lastErrorMessage = responseData?.message || lastErrorMessage
      }

      if (!data) {
        throw new Error(lastErrorMessage)
      }

      if (!data?.token) {
        throw new Error('Réponse invalide du serveur.')
      }

      const roleFromToken = decodeRoleFromToken(data.token)
      const role = data.role || roleFromToken || matchedRole || 'UTILISATEUR'
      const emailPrefix = formData.email.split('@')[0]
      const displayName = role === 'ADMIN'
        ? 'Administrateur'
        : role === 'AGENT'
          ? (data?.nom || emailPrefix)
          : data?.nom || data?.name || emailPrefix

      localStorage.setItem('token', data.token)
      if (data.id) {
        localStorage.setItem('userId', data.id)
      }
      localStorage.setItem('userEmail', formData.email)
      localStorage.setItem('userDisplayName', displayName)
      localStorage.setItem('userRole', role)
      if (role === 'AGENT' && data.agenceId) {
        localStorage.setItem('agentAgenceId', data.agenceId)
      }

      if (role === 'ADMIN') navigate('/admin', { replace: true })
      else if (role === 'AGENT') navigate('/agent', { replace: true })
      else navigate('/profile', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Erreur de connexion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{t('auth.login.title')}</h1>
        <p>{t('auth.login.subtitle')}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t('auth.login.email')}
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
            />
          </label>
          <label>
            {t('auth.login.password')}
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
            />
          </label>
          {error ? <p className="auth-switch">{error}</p> : null}
          <button type="submit" className="primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.login.submit') : t('auth.login.button')}
          </button>
        </form>
        <p className="auth-switch">
          {t('auth.login.noAccount')} <Link to="/creer-compte">{t('auth.login.register')}</Link>
        </p>
      </section>
    </main>
  )
}
