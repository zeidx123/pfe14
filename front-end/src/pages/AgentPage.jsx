import { useEffect, useState, useMemo } from 'react'

import ChatPage from './ChatPage'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { validatePhoneNumberOrEmpty } from '../utils/phoneNumberValidator'
import { getUnreadStatsByPartner, getUnreadTotal } from '../utils/chatUnread'

const contractTypeOptions = ['Voiture', 'Habitation', 'Voyage', 'Prevoyance']

const emptyContratForm = {
  cin: '', numeroContrat: '', codeContrat: '', typeContrat: '',
  dateDebutContrat: '', dateFinContrat: '', fichier: ''
}

const emptyAgenceForm = {
  nomAgence: '', ville: '', adresse: '', telephone: '',
  horaires: '', sotadmin: '', emailSotadmin: '', password: ''
}

const emptyUserForm = {
  nom: '', email: '', password: '', telephone: '',
  cin: '', statutCompte: 'NON_VERIFIE'
}

export default function AgentPage() {
  const agenceId = localStorage.getItem('agentAgenceId')
  const agentName = localStorage.getItem('userDisplayName') || 'Agent'

  const [activeSection, setActiveSection] = useState('agence')
  const [agence, setAgence] = useState(null)
  const [agenceForm, setAgenceForm] = useState(emptyAgenceForm)
  const [isEditingAgence, setIsEditingAgence] = useState(false)

  const [contrats, setContrats] = useState([])
  const [contratForm, setContratForm] = useState(emptyContratForm)
  const [editingContratId, setEditingContratId] = useState(null)
  const [isContratModalOpen, setIsContratModalOpen] = useState(false)
  const [contratToDelete, setContratToDelete] = useState(null)
  const [contratSearch, setContratSearch] = useState('')

  const [utilisateurs, setUtilisateurs] = useState([])
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [editingUserId, setEditingUserId] = useState(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [userSearch, setUserSearch] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [usersMessagesUnreadCount, setUsersMessagesUnreadCount] = useState(0)
  const [adminMessagesUnreadCount, setAdminMessagesUnreadCount] = useState(0)

  // Filtres stables pour éviter de recharger la messagerie à chaque rendu de AgentPage
  const filterUtilisateur = useMemo(() => ['UTILISATEUR'], []);
  const filterAdmin = useMemo(() => ['ADMIN'], []);


  // ── Load agence + contracts ────────────────────────────────────────────────
  const loadAgence = async () => {
    if (!agenceId) { setError('Session invalide. Reconnectez-vous.'); setIsLoading(false); return }
    try {
      const res = await fetch(`/api/agent/agence/${agenceId}`)
      if (!res.ok) throw new Error("Impossible de charger votre agence.")
      const data = await res.json()
      setAgence(data)
      setAgenceForm({
        nomAgence: data.nomAgence || '', ville: data.ville || '',
        adresse: data.adresse || '', telephone: data.telephone || '',
        horaires: data.horaires || '', sotadmin: data.sotadmin || '',
        emailSotadmin: data.emailSotadmin || '', password: ''
      })
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  const loadContrats = async () => {
    if (!agenceId) return
    try {
      const res = await fetch(`/api/agent/contrats/${agenceId}`)
      const data = res.ok ? await res.json() : []
      setContrats(Array.isArray(data) ? data : [])
    } catch { setContrats([]) }
  }

  const loadUtilisateurs = async () => {
    if (!agenceId) return
    try {
      const res = await fetch(`/api/agent/utilisateurs/${agenceId}`)
      const data = res.ok ? await res.json() : []
      setUtilisateurs(Array.isArray(data) ? data : [])
    } catch { setUtilisateurs([]) }
  }

  useEffect(() => { loadAgence(); loadContrats(); loadUtilisateurs() }, [])

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId')
    const token = localStorage.getItem('token')

    if (!currentUserId || !token) {
      setUsersMessagesUnreadCount(0)
      setAdminMessagesUnreadCount(0)
      return
    }

    let cancelled = false
    let currentMessages = []

    const updateUnread = (data) => {
      setUsersMessagesUnreadCount(getUnreadTotal(getUnreadStatsByPartner(data, currentUserId, ['UTILISATEUR'])))
      setAdminMessagesUnreadCount(getUnreadTotal(getUnreadStatsByPartner(data, currentUserId, ['ADMIN'])))
    }

    const loadUnread = async () => {
      try {
        const res = await fetch(`/api/chat/all-my-messages/${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) return

        const data = await res.json()
        if (cancelled) return

        currentMessages = Array.isArray(data) ? data : []
        updateUnread(currentMessages)
      } catch {
        if (!cancelled) {
          setUsersMessagesUnreadCount(0)
          setAdminMessagesUnreadCount(0)
        }
      }
    }

    loadUnread()

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws', null, { transports: ['websocket'] }),
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/user/${currentUserId}/queue/messages`, (frame) => {
          const incomingMsg = JSON.parse(frame.body);
          if (!cancelled) {
            const exists = currentMessages.some(m => m.id === incomingMsg.id);
            if (!exists) {
              currentMessages = [...currentMessages, incomingMsg];
              updateUnread(currentMessages);
            }
          }
        });
      }
    });
    client.activate();

    return () => {
      cancelled = true
      client.deactivate()
    }
  }, [])

  // ── Download handler ───────────────────────────────────────────────────────
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

  // ── Agence handlers ────────────────────────────────────────────────────────
  const handleSaveAgence = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setIsSaving(true)
    const phoneCheck = validatePhoneNumberOrEmpty(agenceForm.telephone)
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error)
      setIsSaving(false)
      return
    }
    try {
      const payload = { ...agenceForm, telephone: phoneCheck.value }
      const res = await fetch(`/api/agent/agence/${agenceId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || 'Erreur sauvegarde.') }
      const updated = await res.json()
      setAgence(updated); setSuccess('Agence mise à jour avec succès.'); setIsEditingAgence(false)
      if (agenceForm.sotadmin) localStorage.setItem('userDisplayName', agenceForm.sotadmin)
    } catch (err) { setError(err.message) }
    finally { setIsSaving(false) }
  }

  // ── Contrat handlers ───────────────────────────────────────────────────────
  const resetContratForm = () => { setContratForm(emptyContratForm); setEditingContratId(null) }

  const handleSubmitContrat = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!contratForm.cin.trim() || !contratForm.numeroContrat.trim()) {
      setError('CIN et numéro contrat sont obligatoires.'); return false
    }
    const nomAgence = agence?.nomAgence || ''
    const payload = { ...contratForm, nomAgence }
    const url = editingContratId ? `/api/agent/contrats/${editingContratId}` : '/api/agent/contrats'
    const method = editingContratId ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Erreur sauvegarde contrat.')
      setSuccess(editingContratId ? 'Contrat modifié.' : 'Contrat ajouté.')
      resetContratForm(); await loadContrats(); return true
    } catch (err) { setError(err.message); return false }
  }

  const handleEditContrat = (c) => {
    setContratForm({
      cin: c.cin || '', numeroContrat: c.numeroContrat || '',
      codeContrat: c.codeContrat || '', typeContrat: c.typeContrat || '',
      dateDebutContrat: c.dateDebutContrat || '', dateFinContrat: c.dateFinContrat || '',
      fichier: c.fichier || ''
    })
    setEditingContratId(c.id)
  }

  const handleDeleteContrat = async (id) => {
    setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/agent/contrats/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Impossible de supprimer.')
      setSuccess('Contrat supprimé.'); await loadContrats(); return true
    } catch (err) { setError(err.message); return false }
  }

  const filteredContrats = contrats.filter(c => {
    const t = contratSearch.trim().toLowerCase()
    if (!t) return true
    return [c.numeroContrat, c.cin, c.typeContrat, c.codeContrat].some(v => String(v || '').toLowerCase().includes(t))
  })

  // ── User handlers ──────────────────────────────────────────────────────────
  const resetUserForm = () => { setUserForm(emptyUserForm); setEditingUserId(null) }

  const handleSubmitUser = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!userForm.nom.trim() || !userForm.email.trim()) {
      setError('Nom et email sont obligatoires.'); return false
    }
    const phoneCheck = validatePhoneNumberOrEmpty(userForm.telephone)
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error)
      return false
    }
    const url = `/api/agent/utilisateurs/${editingUserId}`
    try {
      const payload = { ...userForm, telephone: phoneCheck.value }
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Erreur sauvegarde utilisateur.')
      setSuccess('Utilisateur modifié.')
      resetUserForm(); await loadUtilisateurs(); return true
    } catch (err) { setError(err.message); return false }
  }

  const handleEditUser = (u) => {
    setUserForm({
      nom: u.nom || '', email: u.email || '', password: '', telephone: u.telephone || '',
      cin: u.cin || '', statutCompte: u.statutCompte || 'NON_VERIFIE'
    })
    setEditingUserId(u.id)
  }

  const handleDeleteUser = async (id) => {
    setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/agent/utilisateurs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Impossible de supprimer.')
      setSuccess('Utilisateur supprimé.'); await loadUtilisateurs(); return true
    } catch (err) { setError(err.message); return false }
  }

  const filteredUtilisateurs = utilisateurs.filter(u => {
    const t = userSearch.trim().toLowerCase()
    if (!t) return true
    return [u.nom, u.email, u.cin].some(v => String(v || '').toLowerCase().includes(t))
  })

  const handleLogout = () => {
    ['token', 'userEmail', 'userDisplayName', 'userRole', 'agentAgenceId'].forEach(k => localStorage.removeItem(k))
    window.location.href = '/se-connecter'
  }

  // ── Sidebar sections ───────────────────────────────────────────────────────
  const sections = [
    {
      key: 'agence', label: 'Mon agence', icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20s6-4.9 6-9a6 6 0 1 0-12 0c0 4.1 6 9 6 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.8" />
        </svg>)
    },
    {
      key: 'contrats', label: 'Mes contrats', icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>)
    },
    {
      key: 'utilisateurs', label: 'Mes clients', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>)
    },
    {
      key: 'messages_utilisateurs', label: 'Messagerie Utilisateurs', icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7.8A2.8 2.8 0 0 1 6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v6.4a2.8 2.8 0 0 1-2.8 2.8H11l-3.8 2.8c-.7.5-1.7 0-1.7-.9V17H6.8A2.8 2.8 0 0 1 4 14.2V7.8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>)
    },
    {
      key: 'messages_admin', label: 'Messagerie Admin', icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7.8A2.8 2.8 0 0 1 6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v6.4a2.8 2.8 0 0 1-2.8 2.8H11l-3.8 2.8c-.7.5-1.7 0-1.7-.9V17H6.8A2.8 2.8 0 0 1 4 14.2V7.8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>)
    }
  ]

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderAgenceSection = () => (
    <section className="section admin-block">
      {!isEditingAgence ? (
        <>
          <div className="admin-table-toolbar">
            <h2>Informations de mon agence</h2>
            <div className="admin-table-toolbar-right">
              <button type="button" className="admin-add-btn"
                onClick={() => { setIsEditingAgence(true); setSuccess(''); setError('') }}>
                ✏️ Modifier
              </button>
            </div>
          </div>
          <div className="agent-dashboard-overview" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

              {/* Carte Agence */}
              <div style={{ background: 'linear-gradient(145deg, #1e2638 0%, #151b2b 100%)', borderRadius: '16px', overflow: 'hidden', border: '1px solid #2a3650', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ background: 'linear-gradient(90deg, #3182ce 0%, #2b6cb0 100%)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏢</div>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>Informations de l'Agence</h3>
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.85rem', opacity: 0.9 }}>Détails physiques et contacts</p>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {[
                    { label: "Nom de l'agence", value: agence?.nomAgence },
                    { label: 'Ville', value: agence?.ville },
                    { label: 'Adresse', value: agence?.adresse },
                    { label: 'Téléphone', value: agence?.telephone },
                    { label: 'Horaires', value: agence?.horaires },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.8rem' }}>
                      <span style={{ color: '#a0aec0', fontSize: '0.9rem' }}>{label}</span>
                      <span style={{ color: '#f7fafc', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>
                        {value || <span style={{ color: '#4a5568', fontStyle: 'italic' }}>Non renseigné</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carte Agent */}
              <div style={{ background: 'linear-gradient(145deg, #1e2638 0%, #151b2b 100%)', borderRadius: '16px', overflow: 'hidden', border: '1px solid #2a3650', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ background: 'linear-gradient(90deg, #38b2ac 0%, #319795 100%)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>Profil Responsable</h3>
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.85rem', opacity: 0.9 }}>Informations de connexion</p>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {[
                    { label: 'Nom complet', value: agence?.sotadmin },
                    { label: 'Adresse email', value: agence?.emailSotadmin },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.8rem' }}>
                      <span style={{ color: '#a0aec0', fontSize: '0.9rem' }}>{label}</span>
                      <span style={{ color: '#f7fafc', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>
                        {value || <span style={{ color: '#4a5568', fontStyle: 'italic' }}>Non renseigné</span>}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <div style={{ background: 'rgba(56, 178, 172, 0.1)', border: '1px dashed #38b2ac', padding: '1rem', borderRadius: '8px', color: '#81e6d9', fontSize: '0.85rem', textAlign: 'center' }}>
                      <strong>Sécurité :</strong> Votre mot de passe est crypté et protégé. Vous pouvez le modifier via le bouton "Modifier".
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ background: '#f7fafc', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#1a202c', fontSize: '1.5rem', fontWeight: '700' }}>Modifier mon agence</h2>
              <p style={{ margin: '0.5rem 0 0', color: '#718096', fontSize: '0.95rem' }}>Mettre à jour les informations de l'agence et de contact</p>
            </div>

            <form className="admin-modal-form-grid" onSubmit={handleSaveAgence}>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Nom de l'agence *
                <input name="nomAgence" type="text" value={agenceForm.nomAgence} onChange={e => setAgenceForm(p => ({ ...p, nomAgence: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} required />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Ville
                <input name="ville" type="text" value={agenceForm.ville} onChange={e => setAgenceForm(p => ({ ...p, ville: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600', gridColumn: '1 / -1' }}>Adresse
                <input name="adresse" type="text" value={agenceForm.adresse} onChange={e => setAgenceForm(p => ({ ...p, adresse: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Téléphone
                <input name="telephone" type="text" value={agenceForm.telephone} onChange={e => setAgenceForm(p => ({ ...p, telephone: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} inputMode="tel" />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Horaires
                <input name="horaires" type="text" value={agenceForm.horaires} onChange={e => setAgenceForm(p => ({ ...p, horaires: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Nom de l'agent
                <input name="sotadmin" type="text" value={agenceForm.sotadmin} onChange={e => setAgenceForm(p => ({ ...p, sotadmin: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600' }}>Email de l'agent
                <input name="emailSotadmin" type="email" value={agenceForm.emailSotadmin} onChange={e => setAgenceForm(p => ({ ...p, emailSotadmin: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>
              <label style={{ color: '#2d3748', fontWeight: '600', gridColumn: '1 / -1' }}>Nouveau mot de passe
                <input name="password" type="password" value={agenceForm.password} placeholder="Laisser vide si inchangé" onChange={e => setAgenceForm(p => ({ ...p, password: e.target.value }))} style={{ background: 'white', color: '#1a202c', border: '1px solid #cbd5e0' }} />
              </label>

              <div className="admin-modal-actions" style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="button"
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#334155', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                  onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                  onClick={() => { setIsEditingAgence(false); setError(''); setSuccess('') }}>
                  Annuler
                </button>
                <button type="submit" disabled={isSaving}
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#7c3aed'}
                  onMouseOut={(e) => e.target.style.background = '#8b5cf6'}>
                  {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )

  const renderContratsSection = () => (
    <section className="section admin-block">
      <div className="admin-table-toolbar">
        <h2>Mes contrats</h2>
        <div className="admin-table-toolbar-right">
          <button type="button" className="admin-add-btn" onClick={() => { resetContratForm(); setIsContratModalOpen(true) }}>
            + Ajouter
          </button>
          <input type="text" className="admin-table-search" placeholder="Rechercher..." value={contratSearch}
            onChange={e => setContratSearch(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>CONTRAT</th><th>CIN</th><th>TYPE</th><th>STATUT</th><th>DÉBUT</th><th>FIN</th><th>FICHIER DE CONTRAT</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredContrats.map(c => (
              <tr key={c.id}>
                <td>{c.numeroContrat || '-'}</td>
                <td>{c.cin || '-'}</td>
                <td>{c.typeContrat || '-'}</td>
                <td>
                  <span className={`admin-status-pill ${c.statut === 'ACTIF' ? 'history-status-open' : 'history-status-closed'}`}>
                    {c.statut || 'INCONNU'}
                  </span>
                </td>
                <td>{c.dateDebutContrat || '-'}</td>
                <td>{c.dateFinContrat || '-'}</td>
                <td>
                  {c.fichier ? (
                    <button type="button" onClick={() => handleDownloadFichier(c.fichier, c.numeroContrat)} className="admin-action-btn" style={{ background: '#38b2ac', color: '#fff', border: 'none', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85em', display: 'inline-block', textAlign: 'center' }}>
                      Télécharger
                    </button>
                  ) : (
                    <span style={{ color: '#a0aec0', fontSize: '0.85em', fontStyle: 'italic' }}>Aucun coordonné</span>
                  )}
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-action-btn admin-action-edit"
                      onClick={() => { handleEditContrat(c); setIsContratModalOpen(true) }}>Modifier</button>
                    <button type="button" className="admin-action-btn admin-action-delete"
                      onClick={() => setContratToDelete(c)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contrats.length === 0 && <p className="auth-switch">Aucun contrat pour cette agence.</p>}
        {contrats.length > 0 && filteredContrats.length === 0 && <p className="auth-switch">Aucun contrat pour cette recherche.</p>}
      </div>

      {/* Add / Edit modal */}
      {isContratModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsContratModalOpen(false)}>
          <div className={`admin-modal-card ${editingContratId ? 'admin-modal-card-blue' : 'admin-modal-card-success'}`} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>{editingContratId ? 'Modifier contrat' : 'Nouveau contrat'}</h3>
                <p>{editingContratId ? 'Mettre à jour les informations' : 'Créer un contrat'}</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setIsContratModalOpen(false)}>X</button>
            </div>
            <form className="admin-modal-body admin-modal-form-grid"
              onSubmit={async e => { const ok = await handleSubmitContrat(e); if (ok) setIsContratModalOpen(false) }}>
              <label>CIN * <input name="cin" value={contratForm.cin} onChange={e => setContratForm(p => ({ ...p, cin: e.target.value.replace(/\D/g, '').slice(0, 8) }))} required inputMode="numeric" maxLength="8" pattern="\d{8}" placeholder="8 chiffres" title="CIN doit contenir exactement 8 chiffres" /></label>
              <label>Numéro contrat * <input name="numeroContrat" value={contratForm.numeroContrat} onChange={e => setContratForm(p => ({ ...p, numeroContrat: e.target.value }))} required /></label>
              <label>Code contrat <input name="codeContrat" value={contratForm.codeContrat} onChange={e => setContratForm(p => ({ ...p, codeContrat: e.target.value }))} /></label>
              <label>Type contrat
                <select name="typeContrat" value={contratForm.typeContrat} onChange={e => setContratForm(p => ({ ...p, typeContrat: e.target.value }))}>
                  <option value="">Choisir un type</option>
                  {contractTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Date début <input type="date" name="dateDebutContrat" value={contratForm.dateDebutContrat} onChange={e => setContratForm(p => ({ ...p, dateDebutContrat: e.target.value }))} /></label>
              <label>Date fin <input type="date" name="dateFinContrat" value={contratForm.dateFinContrat} onChange={e => setContratForm(p => ({ ...p, dateFinContrat: e.target.value }))} /></label>
              <label>Fichier (PDF)
                <input type="file" accept=".pdf" name="fichier" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64String = reader.result.replace(/^data:(.*,)?/, '');
                      setContratForm(p => ({ ...p, fichier: base64String }));
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setContratForm(p => ({ ...p, fichier: '' }));
                  }
                }} />
                {contratForm.fichier && <span style={{ display: 'block', marginTop: '4px', color: '#38b2ac', fontSize: '0.85em' }}>✓ Fichier PDF joint</span>}
              </label>
              {/* nomAgence auto-filled from agence */}
              <div className="admin-modal-actions">
                <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsContratModalOpen(false)}>Annuler</button>
                <button type="submit" className={`admin-modal-btn ${editingContratId ? 'admin-modal-btn-primary' : 'admin-modal-btn-success'}`}>
                  {editingContratId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {contratToDelete && (
        <div className="admin-modal-overlay" onClick={() => setContratToDelete(null)}>
          <div className="admin-modal-card admin-modal-card-danger" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div><h3>Supprimer ce contrat ?</h3><p>{contratToDelete.numeroContrat || '-'}</p></div>
              <button type="button" className="admin-modal-close" onClick={() => setContratToDelete(null)}>X</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-modal-warning">Cette action est irréversible.</p>
              <div className="admin-modal-actions">
                <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setContratToDelete(null)}>Annuler</button>
                <button type="button" className="admin-modal-btn admin-modal-btn-danger"
                  onClick={async () => { const ok = await handleDeleteContrat(contratToDelete.id); if (ok) setContratToDelete(null) }}>
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )

  const renderUtilisateursSection = () => (
    <section className="section admin-block">
      <div className="admin-table-toolbar">
        <h2>Mes clients (Utilisateurs)</h2>
        <div className="admin-table-toolbar-right">
          <input type="text" className="admin-table-search" placeholder="Rechercher..." value={userSearch}
            onChange={e => setUserSearch(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>UTILISATEUR</th><th>CONTACT</th><th>CIN</th><th>STATUT</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUtilisateurs.map(u => (
              <tr key={u.id}>
                <td><strong>{u.nom || '-'}</strong></td>
                <td><p style={{ margin: 0, fontSize: '0.85em', color: '#a0aec0' }}>{u.email}</p><p style={{ margin: 0, fontSize: '0.85em', color: '#718096' }}>{u.telephone || '-'}</p></td>
                <td>{u.cin || '-'}</td>
                <td>
                  <span className={`admin-status-pill ${u.statutCompte === 'VERIFIE' ? 'history-status-open' : 'history-status-closed'}`}>
                    {u.statutCompte || 'NON_VERIFIE'}
                  </span>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-action-btn admin-action-edit"
                      onClick={() => { handleEditUser(u); setIsUserModalOpen(true) }}>Modifier</button>
                    <button type="button" className="admin-action-btn admin-action-delete"
                      onClick={() => setUserToDelete(u)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {utilisateurs.length === 0 && <p className="auth-switch">Aucun client pour cette agence.</p>}
        {utilisateurs.length > 0 && filteredUtilisateurs.length === 0 && <p className="auth-switch">Aucun client pour cette recherche.</p>}
      </div>

      {/* Edit modal */}
      {isUserModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsUserModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ background: '#e9e3ff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1a202c', fontSize: '1.4rem', fontWeight: '800' }}>Modifier le profil</h3>
                <p style={{ margin: '0.2rem 0 0', color: '#4a5568', fontSize: '0.9rem', fontWeight: '500' }}>@{userForm.nom || 'utilisateur'}</p>
              </div>
              <button type="button" onClick={() => setIsUserModalOpen(false)} style={{ background: 'white', color: '#e53e3e', border: 'none', borderRadius: '8px', width: '30px', height: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>X</button>
            </div>
            <form className="admin-modal-form-grid" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}
              onSubmit={async e => { const ok = await handleSubmitUser(e); if (ok) setIsUserModalOpen(false) }}>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700' }}>Nom d'utilisateur
                <input name="nom" value={userForm.nom} onChange={e => setUserForm(p => ({ ...p, nom: e.target.value }))} required style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c' }} />
              </label>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700' }}>Adresse email
                <input name="email" type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c' }} />
              </label>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700' }}>Nouveau mot de passe
                <input name="password" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Laisser vide pour ne pas changer" style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c' }} />
              </label>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700' }}>Téléphone
                <input name="telephone" value={userForm.telephone} onChange={e => setUserForm(p => ({ ...p, telephone: e.target.value }))} style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c' }} inputMode="tel" />
              </label>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700' }}>CIN
                <input name="cin" value={userForm.cin} onChange={e => setUserForm(p => ({ ...p, cin: e.target.value.replace(/\D/g, '').slice(0, 8) }))} style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c' }} inputMode="numeric" maxLength="8" pattern="\d{8}" placeholder="CIN (8 chiffres)" title="CIN doit contenir exactement 8 chiffres" />
              </label>

              <label style={{ color: '#2d3748', fontSize: '0.85rem', fontWeight: '700', gridColumn: 'span 2' }}>Statut
                <select name="statutCompte" value={userForm.statutCompte} onChange={e => setUserForm(p => ({ ...p, statutCompte: e.target.value }))} style={{ marginTop: '0.4rem', width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a202c', backgroundColor: 'white' }}>
                  <option value="VERIFIE">VERIFIE</option>
                  <option value="NON_VERIFIE">NON_VERIFIE</option>
                </select>
              </label>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsUserModalOpen(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#f8fafc', color: '#334155', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                  onMouseOut={(e) => e.target.style.background = '#f8fafc'}>
                  Annuler
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.39)' }}
                  onMouseOver={(e) => e.target.style.background = '#6d28d9'}
                  onMouseOut={(e) => e.target.style.background = '#7c3aed'}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {userToDelete && (
        <div className="admin-modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="admin-modal-card admin-modal-card-danger" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div><h3>Supprimer ce client ?</h3><p>{userToDelete.nom} ({userToDelete.email})</p></div>
              <button type="button" className="admin-modal-close" onClick={() => setUserToDelete(null)}>X</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-modal-warning">Cette action est irréversible et supprimera le compte utilisateur de manière définitive.</p>
              <div className="admin-modal-actions">
                <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setUserToDelete(null)}>Annuler</button>
                <button type="button" className="admin-modal-btn admin-modal-btn-danger"
                  onClick={async () => { const ok = await handleDeleteUser(userToDelete.id); if (ok) setUserToDelete(null) }}>
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )

  return (
    <main className="admin-page">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="#86dfdf" opacity="0.15" />
              <path d="M12 20s4-4 8-4 8 4 8 4-4 4-8 4-8-4-8-4z" stroke="#00cccc" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="20" r="2.5" fill="#00cccc" />
            </svg>
            <span>Espace Agent</span>
          </div>
        </div>

        <nav className="admin-side-nav" aria-label="Navigation agent">
          {sections.map(s => (
            <button key={s.key} type="button"
              className={`admin-side-btn ${activeSection === s.key ? 'is-active' : ''}`}
              onClick={() => { setActiveSection(s.key); setError(''); setSuccess('') }}>
              <span className="admin-side-icon">{s.icon}</span>
              <span className="admin-side-label">{s.label}</span>
              {s.key === 'messages_utilisateurs' && usersMessagesUnreadCount > 0 ? (
                <span className="admin-side-badge">{usersMessagesUnreadCount > 9 ? '9+' : usersMessagesUnreadCount}</span>
              ) : null}
              {s.key === 'messages_admin' && adminMessagesUnreadCount > 0 ? (
                <span className="admin-side-badge">{adminMessagesUnreadCount > 9 ? '9+' : adminMessagesUnreadCount}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4a7 7 0 10-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-header-title">
              {activeSection === 'agence' ? 'Mon agence' :
                activeSection === 'contrats' ? 'Gestion des contrats' :
                  activeSection === 'utilisateurs' ? 'Mes clients' :
                    activeSection === 'messages_utilisateurs' ? 'Messagerie Utilisateurs' :
                      'Messagerie Admin'}
            </h1>
          </div>
          <div className="admin-header-right">
            <button type="button" className="admin-avatar-btn">
              <span className="admin-avatar-badge">{agentName.slice(0, 2).toUpperCase()}</span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-alerts-container">
            {isLoading && <p className="admin-alert admin-alert-info">Chargement...</p>}
            {error && <p className="admin-alert admin-alert-error">{error}</p>}
            {success && <p className="admin-alert admin-alert-success">{success}</p>}
          </div>

          {!isLoading && agence && activeSection === 'agence' && renderAgenceSection()}
          {!isLoading && activeSection === 'contrats' && renderContratsSection()}
          {!isLoading && agence && activeSection === 'utilisateurs' && renderUtilisateursSection()}
          {!isLoading && agence && activeSection === 'messages_utilisateurs' && (
            <div style={{ marginTop: '20px' }}>
              <ChatPage key="users" targetRoleFilter={filterUtilisateur} />
            </div>
          )}
          {!isLoading && agence && activeSection === 'messages_admin' && (
            <div style={{ marginTop: '20px' }}>
              <ChatPage key="admin" targetRoleFilter={filterAdmin} />
            </div>
          )}

          {!isLoading && !agence && !error && (
            <p className="auth-switch" style={{ padding: '2rem' }}>Aucune agence associée.</p>
          )}
        </div>
      </div>
    </main>
  )
}
