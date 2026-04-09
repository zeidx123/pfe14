import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import logo from './assets/assurgo-logo_Version2.svg'
import AdminPage from './pages/AdminPage'
import AgentPage from './pages/AgentPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MaPrevoyancePage from './pages/MaPrevoyancePage'
import MaVoiturePage from './pages/MaVoiturePage'
import MonHabitationPage from './pages/MonHabitationPage'
import MonVoyagePage from './pages/MonVoyagePage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'

import AssistancePage from './pages/AssistancePage'
import AgencesPage from './pages/AgencesPage'
import ContactPage from './pages/ContactPage'
import BulletinPage from './pages/BulletinPage'
import DeclarationSinistrePage from './pages/DeclarationSinistrePage'
import ChatPage from './pages/ChatPage'
import ChatWidget from './components/ChatWidget'
import { getUnreadStatsByPartner, getUnreadTotal } from './utils/chatUnread'

const publicLinks = [
  { label: 'Assistance', to: '/assistance' },
  { label: 'Agences', to: '/agences' },
  { label: 'Contact', to: '/contact' },
  { label: 'Bulletin', to: '/bulletin' },
  { label: 'Messagerie', to: '/messagerie', private: true }
]

const privateLinks = [
  { label: 'Ma voiture', to: '/ma-voiture' },
  { label: 'Mon habitation', to: '/mon-habitation' },
  { label: 'Mon voyage', to: '/mon-voyage' },
  { label: 'Ma prévoyance', to: '/ma-prevoyance' }
]

const normalizeRole = (role) => {
  if (!role) {
    return 'UTILISATEUR'
  }

  const normalized = role.toString().trim().toUpperCase()
  return normalized.startsWith('ROLE_') ? normalized.replace('ROLE_', '') : normalized
}

const getNavAvatarLabel = (nom, email) => {
  const source = (nom || email || 'U').trim().replace(/@.*/, '')
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

const getNavAvatarColor = (seed) => {
  const colors = ['#f28b82', '#fbbc04', '#34a853', '#4a90e2', '#9c88ff', '#ff7f50', '#00b8bd']
  let hash = 0
  const s = String(seed || 'x')
  for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const formatNavRelativeTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const mins = Math.max(1, Math.floor((Date.now() - d.getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h`
  return `${Math.floor(hrs / 24)} j`
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')
  const isAuthenticated = Boolean(token)
  const userRole = normalizeRole(localStorage.getItem('userRole'))
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isAgentRoute = location.pathname.startsWith('/agent')
  const defaultAuthenticatedPath = userRole === 'ADMIN' ? '/admin' : userRole === 'AGENT' ? '/agent' : '/profile'
  const [userDisplayName, setUserDisplayName] = useState(
    localStorage.getItem('userDisplayName') || localStorage.getItem('userEmail') || 'Mon profil'
  )
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isMessengerOpen, setIsMessengerOpen] = useState(false)
  const [navMessages, setNavMessages] = useState([])
  const [navMsgView, setNavMsgView] = useState('list')
  const [selectedNavMsg, setSelectedNavMsg] = useState(null)
  const [navReplies, setNavReplies] = useState([])
  const [navReplyText, setNavReplyText] = useState('')
  const [navNewMsg, setNavNewMsg] = useState({ sujet: '', message: '' })
  const [isNavSending, setIsNavSending] = useState(false)
  const [navMsgError, setNavMsgError] = useState('')
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  const [userContracts, setUserContracts] = useState([])
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setUserDisplayName('Mon profil')
      setUserContracts([])
      return
    }

    if (!token) {
      return
    }

    if (userRole === 'ADMIN') {
      const adminDisplayName = localStorage.getItem('userDisplayName') || 'Administrateur'
      setUserDisplayName(adminDisplayName)
      return
    }

    if (userRole === 'AGENT') {
      const agentDisplayName = localStorage.getItem('userDisplayName') || 'Agent'
      setUserDisplayName(agentDisplayName)
      return
    }

    setIsProfileLoading(true)
    fetch('/api/utilisateurs/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Impossible de charger le profil')
        }
        return response.json()
      })
      .then((data) => {
        const displayName = data?.nom?.trim() || data?.email || 'Mon profil'
        setUserDisplayName(displayName)
        localStorage.setItem('userDisplayName', displayName)
        if (data?.email) {
          localStorage.setItem('userEmail', data.email)
        }
        setUserContracts(data?.contrats || [])
      })
      .catch(() => {
        const fallback = localStorage.getItem('userDisplayName') || localStorage.getItem('userEmail') || 'Mon profil'
        setUserDisplayName(fallback)
      })
      .finally(() => {
        setIsProfileLoading(false)
      })
  }, [isAuthenticated, token, userRole])

  useEffect(() => {
    if (!isProfileDropdownOpen) return
    const close = (e) => {
      if (!e.target.closest('.nav-profile-dropdown-wrap')) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [isProfileDropdownOpen])

  useEffect(() => {
    if (!isAuthenticated || !token || userRole === 'ADMIN') return
    fetch('/api/contact-messages/mine', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNavMessages(Array.isArray(data) ? data : []))
      .catch(() => { })
  }, [isAuthenticated, token, userRole])

  useEffect(() => {
    if (!isAuthenticated || !token || !userId || userRole === 'ADMIN' || userRole === 'AGENT') {
      setChatUnreadCount(0)
      return
    }

    let cancelled = false
    let currentMessages = []

    const updateUnread = (data) => {
      const unreadStats = getUnreadStatsByPartner(data, userId)
      setChatUnreadCount(getUnreadTotal(unreadStats))
    }

    const loadUnread = async () => {
      try {
        const response = await fetch(`/api/chat/all-my-messages/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) return

        const data = await response.json()
        if (!cancelled) {
          currentMessages = Array.isArray(data) ? data : []
          updateUnread(currentMessages)
        }
      } catch {
        if (!cancelled) setChatUnreadCount(0)
      }
    }

    loadUnread()

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws', null, { transports: ['websocket'] }),
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/user/${userId}/queue/messages`, (frame) => {
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
  }, [isAuthenticated, token, userId, userRole])

  useEffect(() => {
    if (!isMessengerOpen) return
    const close = (e) => {
      if (!e.target.closest('.nav-messenger-floating-panel') && !e.target.closest('.nav-messenger-btn')) {
        setIsMessengerOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [isMessengerOpen])

  const loadNavReplies = (msgId) => {
    if (!msgId || !token) return
    fetch(`/api/contact-messages/${msgId}/replies`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNavReplies(Array.isArray(data) ? data : []))
      .catch(() => { })
  }

  const handleNavOpenThread = (msg) => {
    setSelectedNavMsg(msg)
    setNavReplies([])
    setNavMsgError('')
    loadNavReplies(msg.id)
    setNavMsgView('thread')
  }

  const handleNavSendReply = async (e) => {
    e.preventDefault()
    if (!navReplyText.trim() || !selectedNavMsg) return
    setIsNavSending(true)
    setNavMsgError('')
    try {
      const response = await fetch(`/api/contact-messages/${selectedNavMsg.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: navReplyText })
      })
      if (!response.ok) throw new Error()
      setNavReplyText('')
      loadNavReplies(selectedNavMsg.id)
    } catch {
      setNavMsgError("Erreur lors de l'envoi.")
    } finally {
      setIsNavSending(false)
    }
  }

  const handleNavSendNew = async (e) => {
    e.preventDefault()
    if (!navNewMsg.sujet.trim() || !navNewMsg.message.trim()) return
    setIsNavSending(true)
    setNavMsgError('')
    const email = localStorage.getItem('userEmail') || ''
    const nom = userDisplayName || ''
    try {
      const response = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nom, email, sujet: navNewMsg.sujet, message: navNewMsg.message })
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.message || 'Erreur')
      setNavNewMsg({ sujet: '', message: '' })
      const r2 = await fetch('/api/contact-messages/mine', { headers: { Authorization: `Bearer ${token}` } })
      if (r2.ok) { const d2 = await r2.json(); setNavMessages(Array.isArray(d2) ? d2 : []) }
      if (data?.id) handleNavOpenThread(data)
    } catch (err) {
      setNavMsgError(err.message || "Erreur d'envoi.")
    } finally {
      setIsNavSending(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userDisplayName')
    localStorage.removeItem('userRole')
    setUserDisplayName('Mon profil')
    navigate('/se-connecter', { replace: true })
  }
  return (
    <div className="page">
      {!isAdminRoute && !isAgentRoute && isAuthenticated && userRole !== 'ADMIN' && userRole !== 'AGENT' && (
        <div className="right-floating">
          {privateLinks.map((item) => {
            const contractType = item.label.toLowerCase().replace('ma ', '').replace('mon ', '').replace('é', 'e').trim();
            const hasContract = userContracts.some(c =>
              c.typeContrat?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === contractType ||
              (contractType === 'voiture' && c.typeContrat?.toLowerCase() === 'auto')
            );

            return (
              <Link
                key={item.label}
                to={hasContract ? item.to : '#'}
                style={{ display: 'contents' }}
                onClick={(e) => { if (!hasContract) e.preventDefault(); }}
              >
                <button
                  className={!hasContract ? 'btn-disabled' : ''}
                  title={!hasContract ? 'Vous n\'avez pas de contrat actif pour ce service.' : ''}
                  disabled={!hasContract}
                >
                  {item.label}
                </button>
              </Link>
            )
          })}
        </div>
      )}

      {!isAdminRoute && !isAgentRoute ? (
        <header className="topbar">
          <div className="container nav-wrap">
            <Link className="brand" to="/">
              <img src={logo} alt="AssurGo" className="brand-logo" />
              <span>AssurGo Assurances</span>
            </Link>
            <nav className="nav-links" style={{ justifyContent: 'flex-end', paddingRight: '1rem' }}>
              {publicLinks.filter(l => !l.private || isAuthenticated).map((item) => (
                <Link to={item.to} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="nav-actions">
              {isAuthenticated && userRole !== 'ADMIN' && userRole !== 'AGENT' ? (
                <button
                  className="nav-messenger-btn"
                  onClick={() => navigate('/messagerie')}
                  aria-label="Messages"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.914 1.408 5.526 3.624 7.26V22l3.313-1.818A11.08 11.08 0 0012 20.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2z" />
                  </svg>
                  {chatUnreadCount > 0 && (
                    <span className="nav-messenger-badge">{chatUnreadCount > 9 ? '9+' : chatUnreadCount}</span>
                  )}
                </button>
              ) : null}
              {isAuthenticated ? (
                <div className="nav-profile-dropdown-wrap">
                  <button
                    className="nav-btn secondary-btn nav-profile-trigger"
                    onClick={() => setIsProfileDropdownOpen((v) => !v)}
                  >
                    {userDisplayName}
                    <span className="nav-profile-arrow">{isProfileDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="nav-profile-dropdown">
                      <Link
                        to={defaultAuthenticatedPath}
                        className="nav-dropdown-item"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Mon profil
                      </Link>
                      <hr className="nav-dropdown-divider" />
                      <button
                        className="nav-dropdown-item nav-dropdown-logout"
                        onClick={() => { setIsProfileDropdownOpen(false); handleLogout() }}
                      >
                        Déconnecter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/se-connecter" className="nav-btn secondary-btn">
                    Login
                  </Link>
                  <Link to="/creer-compte" className="nav-btn primary-btn">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ma-voiture" element={<MaVoiturePage />} />
        <Route path="/mon-habitation" element={<MonHabitationPage />} />
        <Route path="/mon-voyage" element={<MonVoyagePage />} />
        <Route path="/ma-prevoyance" element={<MaPrevoyancePage />} />
        <Route
          path="/declaration-sinistre"
          element={
            !isAuthenticated
              ? <Navigate to="/se-connecter" replace />
              : userRole === 'ADMIN'
                ? <Navigate to="/admin" replace />
                : <DeclarationSinistrePage />
          }
        />
        <Route path="/assistance" element={<AssistancePage />} />
        <Route path="/agences" element={<AgencesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/bulletin" element={<BulletinPage />} />
        <Route
          path="/profile"
          element={
            !isAuthenticated
              ? <Navigate to="/se-connecter" replace />
              : userRole === 'ADMIN'
                ? <Navigate to="/admin" replace />
                : <ProfilePage />
          }
        />
        <Route
          path="/agent"
          element={
            !isAuthenticated
              ? <Navigate to="/se-connecter" replace />
              : userRole === 'AGENT'
                ? <AgentPage />
                : <Navigate to={defaultAuthenticatedPath} replace />
          }
        />
        <Route
          path="/admin"
          element={
            !isAuthenticated
              ? <Navigate to="/se-connecter" replace />
              : userRole === 'ADMIN'
                ? <AdminPage />
                : <Navigate to="/profile" replace />
          }
        />
        <Route
          path="/se-connecter"
          element={isAuthenticated ? <Navigate to={defaultAuthenticatedPath} replace /> : <LoginPage />}
        />
        <Route
          path="/creer-compte"
          element={isAuthenticated ? <Navigate to={defaultAuthenticatedPath} replace /> : <RegisterPage />}
        />
        <Route
          path="/messagerie"
          element={!isAuthenticated ? <Navigate to="/se-connecter" replace /> : <ChatPage onUnreadCountChange={setChatUnreadCount} />}
        />
      </Routes>

      {!isAdminRoute && !isAgentRoute ? (
        <section id="contact" className="footer-main">
          <div className="container footer-main-grid">
            <div>
              <img src={logo} alt="AssurGo" className="footer-logo" />
              <p>9 rue de Palestine cité des affaires</p>
              <p>Kheireddine 2060 La Goulette</p>
              <p>70 255 000</p>
            </div>
            <div>
              <h5>Découvrir</h5>
              <Link to="/">FAQs</Link>
              <Link to="/">Téléchargements</Link>
            </div>
            <div>
              <h5>Contact</h5>
              <Link to="/">Lexique</Link>
              <Link to="/se-connecter">Accès partenaires</Link>
            </div>
            <div>
              <h5>Actualités</h5>
              <Link to="/">Plan du site</Link>
              <Link to="/">IAA</Link>
            </div>
          </div>
        </section>
      ) : null}

      {!isAdminRoute && !isAgentRoute ? (
        <footer className="footer">
          <div className="container footer-wrap">
            <p>© 2026 AssurGo Assurances</p>
            <p>Tous droits réservés</p>
          </div>
        </footer>
      ) : null}

      {!isAdminRoute && !isAgentRoute && isMessengerOpen && isAuthenticated && userRole !== 'ADMIN' && userRole !== 'AGENT' ? (
        <div className="nav-messenger-floating-panel">
          <header className="nav-msgpanel-head">
            {navMsgView !== 'list' ? (
              <div className="nav-msgpanel-head-row">
                <button className="nav-msgpanel-circle-btn" onClick={() => { setNavMsgView('list'); setNavMsgError('') }}>
                  &#8592;
                </button>
                <p className="nav-msgpanel-thread-name">{selectedNavMsg?.sujet || 'Conversation'}</p>
                <button className="nav-msgpanel-circle-btn" onClick={() => setIsMessengerOpen(false)}>&#215;</button>
              </div>
            ) : (
              <div className="nav-msgpanel-head-row">
                <span className="nav-msgpanel-title">Discussions</span>
                <div className="nav-msgpanel-head-actions">
                  <button className="nav-msgpanel-circle-btn" title="Nouveau message" onClick={() => { setNavMsgView('compose'); setNavMsgError('') }}>&#9998;</button>
                  <button className="nav-msgpanel-circle-btn" onClick={() => setIsMessengerOpen(false)}>&#8722;</button>
                </div>
              </div>
            )}
          </header>

          {navMsgView === 'list' && (
            <div className="nav-msgpanel-list">
              {navMessages.length === 0 ? (
                <div className="nav-msgpanel-empty">
                  <p>Aucune conversation.</p>
                  <button className="nav-msgpanel-new-btn" onClick={() => setNavMsgView('compose')}>Nouveau message</button>
                </div>
              ) : navMessages.map((item) => (
                <button key={item.id} type="button" className="nav-msgpanel-item" onClick={() => handleNavOpenThread(item)}>
                  <span className="nav-messenger-avatar" style={{ backgroundColor: getNavAvatarColor(item.email || item.id) }}>
                    {getNavAvatarLabel(item.nom, item.email)}
                  </span>
                  <span className="nav-msgpanel-item-body">
                    <span className="nav-msgpanel-item-name">{item.sujet || 'Sans sujet'}</span>
                    <span className="nav-msgpanel-item-preview">{item.message || '-'}</span>
                  </span>
                  <span className="nav-msgpanel-item-time">{formatNavRelativeTime(item.createdAt)}</span>
                </button>
              ))}
            </div>
          )}

          {navMsgView === 'thread' && (
            <>
              <div className="nav-msgpanel-bubbles">
                {selectedNavMsg ? (
                  <div className="nav-chat-bubble nav-bubble-sent">
                    <p>{selectedNavMsg.message}</p>
                    <small>Vous</small>
                  </div>
                ) : null}
                {navReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`nav-chat-bubble ${reply.senderRole === 'UTILISATEUR' ? 'nav-bubble-sent' : 'nav-bubble-recv'}`}
                  >
                    <p>{reply.message}</p>
                    <small>{reply.senderRole === 'UTILISATEUR' ? 'Vous' : 'Admin'}</small>
                  </div>
                ))}
              </div>
              {navMsgError ? <p className="nav-msgpanel-err">{navMsgError}</p> : null}
              <form className="nav-msgpanel-composer" onSubmit={handleNavSendReply}>
                <input
                  type="text"
                  placeholder="Aa"
                  value={navReplyText}
                  onChange={(e) => setNavReplyText(e.target.value)}
                />
                <button type="submit" className="nav-msgpanel-send-btn" disabled={isNavSending}>
                  {isNavSending ? '...' : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  )}
                </button>
              </form>
            </>
          )}

          {navMsgView === 'compose' && (
            <form className="nav-msgpanel-compose" onSubmit={handleNavSendNew}>
              <p className="nav-msgpanel-compose-title">Nouveau message</p>
              <input
                type="text"
                placeholder="Sujet"
                value={navNewMsg.sujet}
                onChange={(e) => setNavNewMsg((p) => ({ ...p, sujet: e.target.value }))}
                required
              />
              <textarea
                placeholder="Votre message..."
                value={navNewMsg.message}
                onChange={(e) => setNavNewMsg((p) => ({ ...p, message: e.target.value }))}
                required
              />
              {navMsgError ? <p className="nav-msgpanel-err">{navMsgError}</p> : null}
              <button type="submit" className="nav-msgpanel-submit-btn" disabled={isNavSending}>
                {isNavSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {!isAdminRoute && !isAgentRoute && <ChatWidget />}
    </div>
  )
}
