import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { validatePhoneNumberOrEmpty } from '../utils/phoneNumberValidator'

const createProfileForm = (profile) => ({
  nom: profile?.nom || '',
  email: profile?.email || '',
  password: '',
  telephone: profile?.telephone || '',
  cin: profile?.cin || ''
})

const historiqueSinistres = [
  {
    reference: 'SIN-2026-0142',
    date: '12/02/2026',
    type: 'Accrochage léger',
    statut: 'En cours'
  },
  {
    reference: 'SIN-2025-0968',
    date: '21/11/2025',
    type: 'Bris de glace',
    statut: 'Clôturé'
  },
  {
    reference: 'SIN-2025-0711',
    date: '05/08/2025',
    type: 'Panne remorquage',
    statut: 'Clôturé'
  }
]

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR').format(parsedDate)
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsedDate)
}

const formatRelativeTime = (value) => {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  const diffInMinutes = Math.max(1, Math.floor((Date.now() - parsedDate.getTime()) / 60000))

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} j`
}

const getAvatarLabel = (nom, email) => {
  const source = (nom || email || 'U').trim()

  if (!source) {
    return 'U'
  }

  const words = source
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

const getAvatarColor = (seed) => {
  const colors = ['#f28b82', '#fbbc04', '#34a853', '#4a90e2', '#9c88ff', '#ff7f50', '#00b8bd']
  const normalizedSeed = String(seed || 'default')

  let hash = 0
  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = normalizedSeed.charCodeAt(index) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

const getContractStatusClass = (status) => (status === 'ACTIF' ? 'history-status-open' : 'history-status-closed')

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(createProfileForm())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }

  const applyProfileData = (data) => {
    setProfile(data)
    setProfileForm(createProfileForm(data))

    if (data?.nom) {
      localStorage.setItem('userDisplayName', data.nom)
    }

    if (data?.email) {
      localStorage.setItem('userEmail', data.email)
    }
  }

  const loadProfile = async () => {
    const response = await fetch('/api/utilisateurs/me', {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Impossible de charger les informations du profil.')
    }

    const data = await response.json()
    applyProfileData(data)
    return data
  }

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      setError('Vous devez vous connecter pour voir votre profil.')
      setIsLoading(false)
      return
    }

    const initializePage = async () => {
      try {
        await loadProfile()
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
  }, [])

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOpenEditModal = () => {
    setProfileForm(createProfileForm(profile))
    setAccountError('')
    setAccountSuccess('')
    setIsEditModalOpen(true)
  }

  const handleSubmitProfile = async (event) => {
    event.preventDefault()
    setAccountError('')
    setAccountSuccess('')

    if (!profileForm.nom.trim() || !profileForm.email.trim()) {
      setAccountError('Nom et email sont obligatoires.')
      return
    }

    const phoneCheck = validatePhoneNumberOrEmpty(profileForm.telephone)
    if (!phoneCheck.isValid) {
      setAccountError(phoneCheck.error)
      return
    }

    setIsSavingProfile(true)

    try {
      const previousEmail = String(profile?.email || '').trim().toLowerCase()
      const payload = {
        ...profileForm,
        telephone: phoneCheck.value
      }
      const response = await fetch('/api/utilisateurs/me', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de mettre a jour le profil.')
      }

      applyProfileData(data)
      setIsEditModalOpen(false)

      const updatedEmail = String(data?.email || '').trim().toLowerCase()
      if (previousEmail && updatedEmail && previousEmail !== updatedEmail) {
        setAccountSuccess('Profil mis a jour. Reconnectez-vous avec votre nouvelle adresse email.')
        localStorage.removeItem('token')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userDisplayName')
        localStorage.removeItem('userRole')
        window.setTimeout(() => {
          window.location.href = '/se-connecter'
        }, 1400)
        return
      }

      setAccountSuccess('Profil mis a jour avec succes.')
    } catch (submitError) {
      setAccountError(submitError.message || 'Erreur lors de la mise a jour du profil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleDownloadFichier = (fichier, numeroContrat) => {
    if (!fichier) return;
    try {
      const byteCharacters = atob(fichier);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${numeroContrat || 'doc'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur téléchargement', e);
      alert('Erreur lors du téléchargement du fichier.');
    }
  };

  const contrats = profile?.contrats || []
  const nombreContrats = profile?.nombreContrats ?? contrats.length
  const isVerified = String(profile?.statutCompte || '').toUpperCase() === 'VERIFIE'
  const roleRaw = String(profile?.role || 'UTILISATEUR').replace('ROLE_', '').toUpperCase()
  const roleLabel = roleRaw === 'ADMIN' ? 'Administrateur' : 'Utilisateur'
  const telephoneLabel = String(profile?.telephone || '').trim() || 'Non renseigne'
  const cinLabel = String(profile?.cin || '').trim() || 'Non renseigne'

  const profileUsername = useMemo(() => {
    const source = String(profile?.nom || profile?.email || 'utilisateur').trim()
    return source.toLowerCase().replace(/\s+/g, '_')
  }, [profile?.nom, profile?.email])

  const memberSinceLabel = useMemo(() => {
    const source = profile?.createdAt || profile?.dateCreation || profile?.createdDate
    const date = source ? new Date(source) : new Date()
    if (Number.isNaN(date.getTime())) {
      return 'Non renseigne'
    }
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  }, [profile?.createdAt, profile?.dateCreation, profile?.createdDate])

  return (
    <main className="profile-page">
      <section className="section container profile-modern-shell">
        {isLoading ? <p className="auth-switch">Chargement des informations...</p> : null}
        {error ? <p className="auth-switch">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <article className="profile-modern-hero">
              <div className="profile-modern-hero-bar" />
              <div className="profile-modern-hero-body">
                <div className="profile-modern-avatar-wrap">
                  <div
                    className="profile-modern-avatar"
                    style={{ backgroundColor: getAvatarColor(profile?.email || profile?.nom || 'profil') }}
                  >
                    <span>{getAvatarLabel(profile?.nom, profile?.email)}</span>
                    <span className="profile-modern-avatar-online" />
                  </div>
                </div>

                <div className="profile-modern-identity">
                  <h1>{profile?.nom || 'Mon profil'}</h1>
                  <p>{profile?.email || '-'}</p>
                  <div className="profile-modern-chip-row">
                    <span className="profile-modern-chip">{roleLabel}</span>
                    <span className="profile-modern-chip">{memberSinceLabel}</span>
                    <span className="profile-modern-chip is-green">{isVerified ? 'Verifie' : 'Non verifie'}</span>
                  </div>
                </div>

                <div className="profile-modern-actions">
                  <button type="button" className="nav-btn primary-btn" onClick={handleOpenEditModal}>Modifier le profil</button>
                </div>
              </div>
            </article>

            {accountError ? <p className="profile-modern-feedback profile-modern-feedback-error">{accountError}</p> : null}
            {accountSuccess ? <p className="profile-modern-feedback profile-modern-feedback-success">{accountSuccess}</p> : null}

            <section className="profile-modern-stats">
              <article className="profile-modern-stat-card">
                <p className="profile-modern-stat-label">Membre depuis</p>
                <strong>{memberSinceLabel}</strong>
              </article>
              <article className="profile-modern-stat-card">
                <p className="profile-modern-stat-label">Role</p>
                <strong>{roleLabel}</strong>
              </article>
              <article className="profile-modern-stat-card">
                <p className="profile-modern-stat-label">Statut</p>
                <strong>{isVerified ? 'Verifie' : 'Non verifie'}</strong>
              </article>
            </section>

            <section className="profile-modern-panels">
              <article className="profile-modern-panel">
                <header className="profile-modern-panel-head">
                  <h2>Informations personnelles</h2>
                </header>

                <div className="profile-mini-grid">
                  <article className="profile-mini-card">
                    <p>Nom d'utilisateur</p>
                    <strong>{profileUsername}</strong>
                  </article>
                  <article className="profile-mini-card">
                    <p>Adresse email</p>
                    <strong>{profile?.email || '-'}</strong>
                  </article>
                  <article className="profile-mini-card">
                    <p>Telephone</p>
                    <strong>{telephoneLabel}</strong>
                  </article>
                  <article className="profile-mini-card">
                    <p>CIN</p>
                    <strong>{cinLabel}</strong>
                  </article>
                  <article className="profile-mini-card">
                    <p>Role</p>
                    <strong>{roleLabel}</strong>
                  </article>
                  <article className="profile-mini-card profile-mini-card-wide">
                    <p>Statut du compte</p>
                    <strong>{isVerified ? 'Verifie' : 'Non verifie'}</strong>
                  </article>
                </div>
              </article>

              <article className="profile-modern-panel">
                <header className="profile-modern-panel-head profile-modern-panel-head-split">
                  <h2>Mes contrats</h2>
                  <span className="profile-modern-message-count">{nombreContrats}</span>
                </header>

                <div className="profile-contract-list profile-contract-list-compact">
                  {contrats.length === 0 ? <p className="auth-switch">Aucun contrat trouve.</p> : null}
                  {contrats.slice(0, 4).map((contrat, index) => (
                    <article
                      key={`${contrat.numeroContrat || 'contrat'}-${index}`}
                      className="profile-contract-item"
                    >
                      <p className="history-label">Agence</p>
                      <p className="history-value">{contrat.nomAgence || '-'}</p>
                      <p className="history-label">Numero</p>
                      <p className="history-value">{contrat.numeroContrat || '-'}</p>
                      <p className="history-label">Date fin</p>
                      <p className="history-value">{formatDate(contrat.dateFinContrat)}</p>
                      <p className="history-label">Statut</p>
                      <span className={`history-status ${getContractStatusClass(contrat.statut)}`}>
                        {contrat.statut || 'INCONNU'}
                      </span>
                      <p className="history-label">Type</p>
                      <p className="history-value">{contrat.typeContrat || '-'}</p>
                      <p className="history-label">Fichier de contrat</p>
                      <div className="history-value">
                        {contrat.fichier ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadFichier(contrat.fichier, contrat.numeroContrat)}
                            className="nav-btn primary-btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginTop: '0.2rem', display: 'inline-block' }}
                          >
                            Télécharger
                          </button>
                        ) : '-'}
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </section>

            <section className="profile-history-section profile-modern-history">
              <div className="profile-history-head">
                <h2>Historique des sinistres</h2>
                <Link to="/ma-voiture" className="nav-btn secondary-btn">
                  Déclarer un sinistre
                </Link>
              </div>

              <div className="profile-history-list">
                {historiqueSinistres.map((sinistre) => (
                  <article key={sinistre.reference} className="profile-history-item">
                    <div>
                      <p className="history-label">Reference</p>
                      <p className="history-value">{sinistre.reference}</p>
                    </div>
                    <div>
                      <p className="history-label">Date</p>
                      <p className="history-value">{sinistre.date}</p>
                    </div>
                    <div>
                      <p className="history-label">Type</p>
                      <p className="history-value">{sinistre.type}</p>
                    </div>
                    <div>
                      <p className="history-label">Statut</p>
                      <span
                        className={`history-status ${sinistre.statut === 'Clôturé' ? 'history-status-closed' : 'history-status-open'
                          }`}
                      >
                        {sinistre.statut}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <p className="auth-switch">
                Retour à <Link to="/">l’accueil</Link>
              </p>
            </section>
          </>
        ) : null}
      </section>

      {isEditModalOpen ? (
        <div className="admin-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="admin-modal-card admin-modal-card-violet profile-edit-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>Modifier mon compte</h3>
                <p>Mettez a jour vos informations personnelles.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setIsEditModalOpen(false)}>X</button>
            </div>

            <form className="admin-modal-body admin-modal-form-grid" onSubmit={handleSubmitProfile}>
              <label>
                Nom
                <input name="nom" value={profileForm.nom} onChange={handleProfileChange} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={profileForm.email} onChange={handleProfileChange} required />
              </label>
              <label>
                Nouveau mot de passe
                <input
                  name="password"
                  type="password"
                  value={profileForm.password}
                  onChange={handleProfileChange}
                  placeholder="Laisser vide pour ne pas changer"
                />
              </label>
              <label>
                Telephone
                <input name="telephone" value={profileForm.telephone} onChange={handleProfileChange} inputMode="tel" />
              </label>
              <label>
                CIN
                <input name="cin" value={profileForm.cin} readOnly style={{ backgroundColor: '#f5f7fa', cursor: 'not-allowed' }} />
              </label>

              {accountError ? <p className="profile-modern-feedback profile-modern-feedback-error profile-modal-feedback">{accountError}</p> : null}

              <div className="admin-modal-actions">
                <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsEditModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="admin-modal-btn admin-modal-btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
