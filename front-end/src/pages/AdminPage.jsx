import { useEffect, useState } from 'react'
import ChatPage from './ChatPage'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { validatePhoneNumberOrEmpty } from '../utils/phoneNumberValidator'
import { getUnreadStatsByPartner, getUnreadTotal } from '../utils/chatUnread'

const emptyContratForm = {
  nomAgence: '',
  cin: '',
  numeroContrat: '',
  codeContrat: '',
  typeContrat: '',
  dateDebutContrat: '',
  dateFinContrat: ''
}

const emptyPublicationForm = {
  titre: '',
  categorie: '',
  imageUrl: '',
  description: '',
  datePublication: '',
  aLaUne: false
}

const emptyDocumentForm = {
  typeDocument: '',
  file: null
}

const emptyAgenceForm = {
  nomAgence: 'ASSURGO',
  ville: '',
  adresse: '',
  telephone: '',
  horaires: '',
  sotadmin: '',
  emailSotadmin: '',
  password: '',
  roleSotadmin: 'AGENT'
}

const contractTypeOptions = [
  'Voiture',
  'Habitation',
  'Voyage',
  'Prevoyance'
]

const agencyNameOptions = [
  'ASSURGO'
]

const villeOptions = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Le Kef',
  'Mahdia',
  'La Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan'
]


const getStatusClass = (status) => (status === 'ACTIF' || status === 'VERIFIE' ? 'history-status-open' : 'history-status-closed')
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

export default function AdminPage() {
  const [activeAdminSection, setActiveAdminSection] = useState('dashboard')
  const [documents, setDocuments] = useState([])
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [editingDocumentId, setEditingDocumentId] = useState(null)
  const [documentSearchTerm, setDocumentSearchTerm] = useState('')
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
  const [isContratModalOpen, setIsContratModalOpen] = useState(false)
  const [contratToDelete, setContratToDelete] = useState(null)

  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false)
  const [publicationToDelete, setPublicationToDelete] = useState(null)
  const [isAgenceModalOpen, setIsAgenceModalOpen] = useState(false)
  const [agenceToDelete, setAgenceToDelete] = useState(null)
  const [contrats, setContrats] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [isGestionOpen, setIsGestionOpen] = useState(false)
  const [isConsultationOpen, setIsConsultationOpen] = useState(false)



  const [contratForm, setContratForm] = useState(emptyContratForm)
  const [editingContratId, setEditingContratId] = useState(null)



  const [contratSearchTerm, setContratSearchTerm] = useState('')
  const [userCinSearchTerm, setUserCinSearchTerm] = useState('')
  const [userAgenceVilleFilter, setUserAgenceVilleFilter] = useState('')
  const [publicationSearchTerm, setPublicationSearchTerm] = useState('')
  const [agenceVilleFilter, setAgenceVilleFilter] = useState('')

  const [publications, setPublications] = useState([])
  const [publicationForm, setPublicationForm] = useState(emptyPublicationForm)
  const [editingPublicationId, setEditingPublicationId] = useState(null)

  const [agences, setAgences] = useState([])
  const [agenceForm, setAgenceForm] = useState(emptyAgenceForm)
  const [editingAgenceId, setEditingAgenceId] = useState(null)

  const [contactMessages, setContactMessages] = useState([])
  const [selectedContactMessageId, setSelectedContactMessageId] = useState(null)
  const [messageReplies, setMessageReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [isReplySubmitting, setIsReplySubmitting] = useState(false)
  const [isThreadOpen, setIsThreadOpen] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId')
    const token = localStorage.getItem('token')

    if (!currentUserId || !token) {
      setChatUnreadCount(0)
      return
    }

    let cancelled = false
    let currentMessages = []

    const updateUnread = (data) => {
      const unreadStats = getUnreadStatsByPartner(data, currentUserId)
      setChatUnreadCount(getUnreadTotal(unreadStats))
    }

    const loadUnread = async () => {
      try {
        const response = await fetch(`/api/chat/all-my-messages/${currentUserId}`, {
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

  const loadData = async () => {
    try {
      const [contratsResponse, utilisateursResponse, contactMessagesResponse, publicationsResponse, agencesResponse, documentsResponse] = await Promise.all([
        fetch('/api/contrats', { headers: getAuthHeaders() }),
        fetch('/api/utilisateurs', { headers: getAuthHeaders() }),
        fetch('/api/contact-messages/admin', { headers: getAuthHeaders() }),
        fetch('/api/publications', { headers: getAuthHeaders() }),
        fetch('/api/agences', { headers: getAuthHeaders() }),
        fetch('/api/documents', { headers: getAuthHeaders() })
      ])

      if (!contratsResponse.ok) {
        throw new Error('Impossible de charger les contrats.')
      }

      if (!utilisateursResponse.ok) {
        throw new Error('Impossible de charger les utilisateurs.')
      }

      if (!contactMessagesResponse.ok) {
        throw new Error('Impossible de charger les messages contact.')
      }

      const contratsData = await contratsResponse.json()
      const utilisateursData = await utilisateursResponse.json()
      const contactMessagesData = await contactMessagesResponse.json()
      const publicationsData = publicationsResponse.ok ? await publicationsResponse.json() : []
      const agencesData = agencesResponse.ok ? await agencesResponse.json() : []

      const normalizedContactMessages = Array.isArray(contactMessagesData) ? contactMessagesData : []

      setContrats(Array.isArray(contratsData) ? contratsData : [])
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : [])
      setContactMessages(normalizedContactMessages)
      setPublications(Array.isArray(publicationsData) ? publicationsData : [])
      setAgences(Array.isArray(agencesData) ? agencesData : [])
      setDocuments(documentsResponse.ok ? await documentsResponse.json() : [])
      setSelectedContactMessageId((prev) => {
        if (prev && normalizedContactMessages.some((item) => item.id === prev)) {
          return prev
        }

        return normalizedContactMessages[0]?.id || null
      })
    } catch (loadError) {
      setError(loadError.message || 'Erreur de chargement admin.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      setError('Session admin introuvable.')
      setIsLoading(false)
      return
    }

    loadData()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token || !selectedContactMessageId) {
      setMessageReplies([])
      return
    }

    fetch(`/api/contact-messages/${selectedContactMessageId}/replies`, {
      headers: getAuthHeaders()
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Impossible de charger les réponses.')
        }
        return response.json()
      })
      .then((data) => {
        setMessageReplies(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setMessageReplies([])
      })
  }, [selectedContactMessageId])

  useEffect(() => {
    if (activeAdminSection !== 'messages') {
      setIsThreadOpen(false)
    }
  }, [activeAdminSection])

  const handleContratChange = (event) => {
    const { name, value } = event.target
    let processedValue = value

    // Sanitize CIN: digits only, max 8 characters
    if (name === 'cin') {
      processedValue = value.replace(/\D/g, '').slice(0, 8)
    }

    setContratForm((prev) => ({ ...prev, [name]: processedValue }))
  }

  const handleUserChange = (event) => {
    const { name, value } = event.target
    let processedValue = value

    // Sanitize CIN: digits only, max 8 characters
    if (name === 'cin') {
      processedValue = value.replace(/\D/g, '').slice(0, 8)
    }

    setUserForm((prev) => ({ ...prev, [name]: processedValue }))
  }

  const resetContratForm = () => {
    setContratForm(emptyContratForm)
    setEditingContratId(null)
  }



  const handleSubmitContrat = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!contratForm.cin.trim() || !contratForm.numeroContrat.trim()) {
      setError('CIN et numéro contrat sont obligatoires.')
      return false
    }

    const url = editingContratId ? `/api/contrats/${editingContratId}` : '/api/contrats'
    const method = editingContratId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(contratForm)
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || 'Erreur de sauvegarde du contrat.')
      }

      setSuccess(editingContratId ? 'Contrat modifié avec succès.' : 'Contrat ajouté avec succès.')
      resetContratForm()
      await loadData()
      return true
    } catch (submitError) {
      setError(submitError.message || 'Erreur contrat.')
      return false
    }
  }

  const handleEditContrat = (contrat) => {
    setContratForm({
      nomAgence: contrat.nomAgence || '',
      cin: contrat.cin || '',
      numeroContrat: contrat.numeroContrat || '',
      codeContrat: contrat.codeContrat || '',
      typeContrat: contrat.typeContrat || '',
      dateDebutContrat: contrat.dateDebutContrat || '',
      dateFinContrat: contrat.dateFinContrat || ''
    })
    setEditingContratId(contrat.id)
  }

  const handleDeleteContrat = async (contratId) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/contrats/${contratId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Impossible de supprimer le contrat.')
      }

      setSuccess('Contrat supprimé avec succès.')
      await loadData()
      return true
    } catch (deleteError) {
      setError(deleteError.message || 'Erreur suppression contrat.')
      return false
    }
  }



  const handleSubmitReply = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedContactMessageId) {
      setError('Choisissez un message utilisateur avant de répondre.')
      return
    }

    if (!replyText.trim()) {
      setError('Le message de réponse est obligatoire.')
      return
    }

    setIsReplySubmitting(true)

    try {
      const response = await fetch(`/api/contact-messages/${selectedContactMessageId}/replies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: replyText })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || 'Impossible d\'envoyer la réponse.')
      }

      setSuccess('Réponse envoyée avec succès.')
      setReplyText('')

      const repliesResponse = await fetch(`/api/contact-messages/${selectedContactMessageId}/replies`, {
        headers: getAuthHeaders()
      })

      if (repliesResponse.ok) {
        const repliesData = await repliesResponse.json()
        setMessageReplies(Array.isArray(repliesData) ? repliesData : [])
      }
    } catch (submitError) {
      setError(submitError.message || 'Erreur lors de l\'envoi de la réponse.')
    } finally {
      setIsReplySubmitting(false)
    }
  }

  const selectedContactMessage = contactMessages.find((item) => item.id === selectedContactMessageId) || null
  const totalMessagesCount = contactMessages.length

  const openThread = (contactMessageId) => {
    setSelectedContactMessageId(contactMessageId)
    setIsThreadOpen(true)
  }

  // --- Publications handlers ---
  const handlePublicationChange = (event) => {
    const { name, value, type, checked } = event.target
    setPublicationForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const resetPublicationForm = () => {
    setPublicationForm(emptyPublicationForm)
    setEditingPublicationId(null)
  }

  const handleSubmitPublication = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!publicationForm.titre.trim()) {
      setError('Le titre de la publication est obligatoire.')
      return false
    }

    const url = editingPublicationId ? `/api/publications/${editingPublicationId}` : '/api/publications'
    const method = editingPublicationId ? 'PUT' : 'POST'

    const payload = {
      ...publicationForm,
      datePublication: publicationForm.datePublication || null
    }

    try {
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.message || 'Erreur de sauvegarde de la publication.')
      setSuccess(editingPublicationId ? 'Publication modifiée avec succès.' : 'Publication ajoutée avec succès.')
      resetPublicationForm()
      await loadData()
      return true
    } catch (submitError) {
      setError(submitError.message || 'Erreur publication.')
      return false
    }
  }

  const handleEditPublication = (pub) => {
    setPublicationForm({
      titre: pub.titre || '',
      categorie: pub.categorie || '',
      imageUrl: pub.imageUrl || '',
      description: pub.description || '',
      datePublication: pub.datePublication || '',
      aLaUne: pub.aLaUne || false
    })
    setEditingPublicationId(pub.id)
  }

  const handleDeletePublication = async (pubId) => {
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/publications/${pubId}`, { method: 'DELETE', headers: getAuthHeaders() })
      if (!response.ok) throw new Error('Impossible de supprimer la publication.')
      setSuccess('Publication supprimée avec succès.')
      await loadData()
      return true
    } catch (deleteError) {
      setError(deleteError.message || 'Erreur suppression publication.')
      return false
    }
  }

  // --- Agences handlers ---
  const handleAgenceChange = (event) => {
    const { name, value } = event.target
    setAgenceForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetAgenceForm = () => {
    setAgenceForm(emptyAgenceForm)
    setEditingAgenceId(null)
  }

  const handleSubmitAgence = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!agenceForm.ville.trim()) {
      setError('La ville de l\'agence est obligatoire.')
      return false
    }

    const phoneCheck = validatePhoneNumberOrEmpty(agenceForm.telephone)
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error)
      return false
    }

    const url = editingAgenceId ? `/api/agences/${editingAgenceId}` : '/api/agences'
    const method = editingAgenceId ? 'PUT' : 'POST'
    const payload = {
      ...agenceForm,
      telephone: phoneCheck.value
    }

    try {
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.message || 'Erreur de sauvegarde de l\'agence.')
      setSuccess(editingAgenceId ? 'Agence modifiée avec succès.' : 'Agence ajoutée avec succès.')
      resetAgenceForm()
      await loadData()
      return true
    } catch (submitError) {
      setError(submitError.message || 'Erreur agence.')
      return false
    }
  }

  const handleEditAgence = (agence) => {
    setAgenceForm({
      nomAgence: agence.nomAgence || '',
      ville: agence.ville || '',
      adresse: agence.adresse || '',
      telephone: agence.telephone || '',
      horaires: agence.horaires || '',
      sotadmin: agence.sotadmin || '',
      emailSotadmin: agence.emailSotadmin || '',
      password: '',
      roleSotadmin: 'AGENT'
    })
    setEditingAgenceId(agence.id)
  }

  const handleDeleteAgence = async (agenceId) => {
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/agences/${agenceId}`, { method: 'DELETE', headers: getAuthHeaders() })
      if (!response.ok) throw new Error('Impossible de supprimer l\'agence.')
      setSuccess('Agence supprimée avec succès.')
      await loadData()
      return true
    } catch (deleteError) {
      setError(deleteError.message || 'Erreur suppression agence.')
      return false
    }
  }

  // --- Documents handlers ---
  const handleDocumentChange = (event) => {
    const { name, value, files } = event.target
    if (name === 'file') {
      setDocumentForm((prev) => ({ ...prev, file: files[0] }))
    } else {
      setDocumentForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const resetDocumentForm = () => {
    setDocumentForm(emptyDocumentForm)
    setEditingDocumentId(null)
  }

  const handleSubmitDocument = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!documentForm.typeDocument) {
      setError('Le type de document est obligatoire.')
      return false
    }

    if (!editingDocumentId && !documentForm.file) {
      setError('Le fichier PDF est obligatoire.')
      return false
    }

    const formData = new FormData()
    formData.append('typeDocument', documentForm.typeDocument)
    if (documentForm.file) {
      if (documentForm.file.type !== 'application/pdf') {
        setError('Seul le format PDF est accepté.')
        return false
      }
      formData.append('file', documentForm.file)
    }

    const url = editingDocumentId ? `/api/documents/${editingDocumentId}` : '/api/documents'
    const method = editingDocumentId ? 'PUT' : 'POST'

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.message || 'Erreur de sauvegarde du document.')

      setSuccess(editingDocumentId ? 'Document modifié avec succès.' : 'Document ajouté avec succès.')
      resetDocumentForm()
      await loadData()
      return true
    } catch (submitError) {
      setError(submitError.message || 'Erreur document.')
      return false
    }
  }

  const handleEditDocument = (doc) => {
    setDocumentForm({
      typeDocument: doc.typeDocument || '',
      file: null
    })
    setEditingDocumentId(doc.id)
  }

  const handleDeleteDocument = async (docId) => {
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Impossible de supprimer le document.')
      setSuccess('Document supprimé avec succès.')
      await loadData()
      return true
    } catch (deleteError) {
      setError(deleteError.message || 'Erreur suppression document.')
      return false
    }
  }

  const filteredContrats = contrats.filter((contrat) => {
    const term = contratSearchTerm.trim().toLowerCase()
    if (!term) {
      return true
    }

    return [contrat.numeroContrat, contrat.cin, contrat.typeContrat, contrat.codeContrat]
      .some((value) => String(value || '').toLowerCase().includes(term))
  })

  const getUtilisateurAgencyVilles = (utilisateur) => {
    const cin = String(utilisateur?.cin || '').trim()
    if (!cin) {
      return []
    }

    const linkedAgencyNames = contrats
      .filter((contrat) => String(contrat?.cin || '').trim() === cin)
      .map((contrat) => String(contrat?.nomAgence || '').trim())
      .filter(Boolean)

    if (linkedAgencyNames.length === 0) {
      return []
    }

    const citySet = new Set(
      agences
        .filter((agence) => linkedAgencyNames.includes(String(agence?.nomAgence || '').trim()))
        .map((agence) => String(agence?.ville || '').trim().toLowerCase())
        .filter(Boolean)
    )

    return [...citySet]
  }

  const filteredUtilisateurs = utilisateurs.filter((utilisateur) => {
    const term = userCinSearchTerm.trim().toLowerCase()
    const matchesSearch = !term || String(utilisateur.cin || '').toLowerCase().includes(term)

    const matchesAgenceVille = !userAgenceVilleFilter
      || getUtilisateurAgencyVilles(utilisateur).includes(userAgenceVilleFilter.toLowerCase())

    return matchesSearch && matchesAgenceVille
  })

  const filteredPublications = publications.filter((publication) => {
    const term = publicationSearchTerm.trim().toLowerCase()
    if (!term) {
      return true
    }

    return [publication.titre, publication.categorie, publication.description]
      .some((value) => String(value || '').toLowerCase().includes(term))
  })

  const filteredAgences = agences.filter((agence) => {
    const matchesVille = !agenceVilleFilter || agence.ville === agenceVilleFilter

    return matchesVille
  })

  const filteredDocuments = documents.filter((doc) => {
    const term = documentSearchTerm.trim().toLowerCase()
    if (!term) return true
    return [doc.typeDocument, doc.fileName]
      .some((v) => String(v || '').toLowerCase().includes(term))
  })

  const getRoleLabel = (utilisateur) => {
    const rawRole = utilisateur?.role || utilisateur?.roles?.[0] || 'UTILISATEUR'
    const normalizedRole = String(rawRole).replace('ROLE_', '').toUpperCase()

    if (normalizedRole === 'ADMIN') {
      return 'administrateur'
    }

    return 'utilisateur'
  }

  const getStatusLabel = (status) => {
    const normalized = String(status || 'NON_VERIFIE').toUpperCase()
    if (normalized === 'VERIFIE' || normalized === 'ACTIF') {
      return 'Vérifié'
    }
    return 'Non vérifié'
  }

  const verifiedUsersCount = utilisateurs.filter((utilisateur) => {
    const status = String(utilisateur?.statutCompte || '').toUpperCase()
    return status === 'VERIFIE' || status === 'ACTIF'
  }).length

  const nonVerifiedUsersCount = Math.max(0, utilisateurs.length - verifiedUsersCount)
  const contratsGeresCount = contrats.length
  const verifiedContratsCount = contrats.filter((contrat) => {
    const status = String(contrat?.statut || '').toUpperCase()
    return status === 'VERIFIE' || status === 'ACTIF'
  }).length
  const messagesRecusCount = contactMessages.length
  const dashboardContrats = contrats.slice(0, 4)
  const dashboardUsers = utilisateurs.slice(0, 4)

  const adminSections = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'contrats', label: 'Consulter les contrats' },
    { key: 'utilisateurs', label: 'Consulter les utilisateurs' },
    { key: 'publications', label: 'Gestion des publications' },
    { key: 'agences', label: 'Gestion des agences' },
    { key: 'documents', label: 'Gestion des documents' },
    { key: 'messages', label: 'Messages agence' }
  ]

  const getSectionIcon = (sectionKey) => {
    switch (sectionKey) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 11.2L12 5l7 6.2v7.3a1 1 0 0 1-1 1h-4.5v-5h-3v5H6a1 1 0 0 1-1-1v-7.3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      case 'contrats':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      case 'utilisateurs':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5.8 19.2c1.5-2.3 3.8-3.5 6.2-3.5s4.7 1.2 6.2 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      case 'publications':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 7.5a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5v-9z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      case 'agences':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20s6-4.9 6-9a6 6 0 1 0-12 0c0 4.1 6 9 6 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )
      case 'messages':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7.8A2.8 2.8 0 0 1 6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v6.4a2.8 2.8 0 0 1-2.8 2.8H11l-3.8 2.8c-.7.5-1.7 0-1.7-.9V17H6.8A2.8 2.8 0 0 1 4 14.2V7.8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      case 'documents':
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      default:
        return null
    }
  }

  const activeSectionLabel = adminSections.find((section) => section.key === activeAdminSection)?.label || 'Tableau de bord'

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="#86dfdf" opacity="0.15" />
              <path d="M20 10V30M10 20H30" stroke="#00cccc" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>AssurGo</span>
          </div>
        </div>

        <nav className="admin-side-nav" aria-label="Sections administration">
          {/* Tableau de bord */}
          <button
            type="button"
            className={`admin-side-btn ${activeAdminSection === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveAdminSection('dashboard')
              setIsHamburgerOpen(false)
              setIsGestionOpen(false)
              setIsConsultationOpen(false)
            }}
          >
            <span className="admin-side-icon">{getSectionIcon('dashboard')}</span>
            <span className="admin-side-label">Tableau de bord</span>
          </button>

          {/* Groupe Gestion */}
          <div className="admin-side-group">
            <div
              className={`admin-side-nav-toggle ${['agences', 'publications', 'documents'].includes(activeAdminSection) ? 'is-active' : ''} ${isGestionOpen ? 'is-open' : ''}`}
              onClick={() => {
                setIsGestionOpen(!isGestionOpen)
                setIsConsultationOpen(false)
              }}
            >
              <span>Gestion</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            <div className={`admin-side-dropdown-list ${isGestionOpen ? 'is-open' : ''}`}>
              {[
                { key: 'agences', label: 'Agences' },
                { key: 'publications', label: 'Publications' },
                { key: 'documents', label: 'Documents' }
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-side-dropdown-item ${activeAdminSection === item.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveAdminSection(item.key)
                    setIsHamburgerOpen(false)
                  }}
                >
                  <span className="admin-side-icon">{getSectionIcon(item.key)}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Groupe Consultations */}
          <div className="admin-side-group">
            <div
              className={`admin-side-nav-toggle ${['contrats', 'utilisateurs'].includes(activeAdminSection) ? 'is-active' : ''} ${isConsultationOpen ? 'is-open' : ''}`}
              onClick={() => {
                setIsConsultationOpen(!isConsultationOpen)
                setIsGestionOpen(false)
              }}
            >
              <span>Consultations</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            <div className={`admin-side-dropdown-list ${isConsultationOpen ? 'is-open' : ''}`}>
              {[
                { key: 'contrats', label: 'Contrats' },
                { key: 'utilisateurs', label: 'Utilisateurs' }
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-side-dropdown-item ${activeAdminSection === item.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveAdminSection(item.key)
                    setIsHamburgerOpen(false)
                  }}
                >
                  <span className="admin-side-icon">{getSectionIcon(item.key)}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <button
            type="button"
            className={`admin-side-btn ${activeAdminSection === 'messages' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveAdminSection('messages')
              setIsHamburgerOpen(false)
              setIsGestionOpen(false)
              setIsConsultationOpen(false)
            }}
            style={{ marginTop: '0.4rem' }}
          >
            <span className="admin-side-icon">{getSectionIcon('messages')}</span>
            <span className="admin-side-label">Messages agence</span>
            {chatUnreadCount > 0 && (
              <span className="admin-side-badge">{chatUnreadCount > 9 ? '9+' : chatUnreadCount}</span>
            )}
          </button>
        </nav>




        <div className="admin-sidebar-bottom">
          <button
            type="button"
            className="admin-logout-btn"
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('userEmail')
              localStorage.removeItem('userDisplayName')
              localStorage.removeItem('userRole')
              window.location.href = '/se-connecter'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4a7 7 0 10-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-header-hamburger"
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              aria-label="Menu sections"
              aria-expanded={isHamburgerOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="admin-header-title">{activeSectionLabel}</h1>
          </div>

          <div className="admin-header-right">
            <button type="button" className="admin-avatar-btn">
              <span className="admin-avatar-badge">AD</span>
            </button>
          </div>

          {isHamburgerOpen && (
            <div className="admin-menu-dropdown-mobile">
              <div className="admin-menu-title">Navigation principale</div>

              <button
                type="button"
                className={`admin-menu-item ${activeAdminSection === 'dashboard' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveAdminSection('dashboard')
                  setIsHamburgerOpen(false)
                }}
              >
                <span className="admin-menu-icon">{getSectionIcon('dashboard')}</span>
                <span className="admin-menu-label">Tableau de bord</span>
              </button>

              <div className="admin-menu-title">Gestions</div>
              {['agences', 'publications', 'documents'].map(key => {
                const section = adminSections.find(s => s.key === key)
                if (!section) return null
                return (
                  <button
                    key={section.key}
                    type="button"
                    className={`admin-menu-item ${activeAdminSection === section.key ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveAdminSection(section.key)
                      setIsHamburgerOpen(false)
                    }}
                  >
                    <span className="admin-menu-icon">{getSectionIcon(section.key)}</span>
                    <span className="admin-menu-label">{section.label}</span>
                  </button>
                )
              })}

              <div className="admin-menu-title">Consultations</div>
              {['contrats', 'utilisateurs'].map(key => {
                const section = adminSections.find(s => s.key === key)
                if (!section) return null
                return (
                  <button
                    key={section.key}
                    type="button"
                    className={`admin-menu-item ${activeAdminSection === section.key ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveAdminSection(section.key)
                      setIsHamburgerOpen(false)
                    }}
                  >
                    <span className="admin-menu-icon">{getSectionIcon(section.key)}</span>
                    <span className="admin-menu-label">{section.label}</span>
                  </button>
                )
              })}

              <div className="admin-menu-title">Communication</div>
              <button
                type="button"
                className={`admin-menu-item ${activeAdminSection === 'messages' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveAdminSection('messages')
                  setIsHamburgerOpen(false)
                }}
              >
                <span className="admin-menu-icon">{getSectionIcon('messages')}</span>
                <span className="admin-menu-label">Messages agence</span>
                {chatUnreadCount > 0 && (
                  <span className="admin-menu-badge">{chatUnreadCount}</span>
                )}
              </button>
            </div>
          )}

        </header>

        <div className="admin-content">
          <div className="admin-alerts-container">
            {isLoading ? <p className="admin-alert admin-alert-info">Chargement...</p> : null}
            {error ? <p className="admin-alert admin-alert-error">{error}</p> : null}
            {success ? <p className="admin-alert admin-alert-success">{success}</p> : null}
          </div>

          {activeAdminSection === 'dashboard' ? (
            <section className="admin-dashboard-shell">
              <h2 className="admin-dashboard-title">Vue d'ensemble</h2>

              <div className="admin-kpi-grid">
                <article className="admin-kpi-card is-blue">
                  <h4>{utilisateurs.length}</h4>
                  <p>Utilisateurs</p>
                  <small>Total enregistrés</small>
                </article>
                <article className="admin-kpi-card is-cyan">
                  <h4>{contratsGeresCount}</h4>
                  <p>Contrats gérés</p>
                  <small>Toutes périodes</small>
                </article>
                <article className="admin-kpi-card is-red">
                  <h4>{nonVerifiedUsersCount}</h4>
                  <p>Comptes à vérifier</p>
                  <small>Nécessitent une attention</small>
                </article>
                <article className="admin-kpi-card is-violet">
                  <h4>{messagesRecusCount}</h4>
                  <p>Messages reçus</p>
                  <small>Depuis le formulaire contact</small>
                </article>
              </div>

              <div className="admin-dashboard-panels">
                <article className="admin-overview-panel">
                  <header className="admin-overview-head">
                    <h3>Derniers contrats</h3>
                  </header>

                  <div className="admin-overview-list">
                    {dashboardContrats.map((contrat) => (
                      <div key={contrat.id} className="admin-overview-row">
                        <span className="admin-overview-link">{contrat.numeroContrat || 'Contrat sans numéro'}</span>
                        <span className="admin-overview-user">{contrat.cin || '-'}</span>
                        <span className={`admin-overview-status ${String(contrat.statut || '').toUpperCase() === 'ACTIF' ? 'is-done' : 'is-pending'}`}>
                          {String(contrat.statut || '').toUpperCase() === 'ACTIF' ? 'Actif' : 'À traiter'}
                        </span>
                      </div>
                    ))}
                    {dashboardContrats.length === 0 ? <p className="auth-switch">Aucun contrat récent.</p> : null}
                  </div>

                  <footer className="admin-overview-foot">
                    <span>Contrats vérifiés</span>
                    <strong>{verifiedContratsCount}/{contratsGeresCount}</strong>
                  </footer>
                </article>

                <article className="admin-overview-panel">
                  <header className="admin-overview-head">
                    <h3>Utilisateurs récents</h3>
                  </header>

                  <div className="admin-overview-list">
                    {dashboardUsers.map((utilisateur) => (
                      <div key={utilisateur.id} className="admin-overview-row users-row">
                        <span
                          className="admin-user-avatar"
                          style={{ backgroundColor: getAvatarColor(utilisateur.email || utilisateur.nom || utilisateur.id) }}
                        >
                          {getAvatarLabel(utilisateur.nom, utilisateur.email)}
                        </span>
                        <span className="admin-overview-user-name">{utilisateur.nom || '-'}</span>
                        <span className="admin-overview-role">{getRoleLabel(utilisateur)}</span>
                      </div>
                    ))}
                    {dashboardUsers.length === 0 ? <p className="auth-switch">Aucun utilisateur récent.</p> : null}
                  </div>

                  <footer className="admin-overview-metrics">
                    <div>
                      <strong>{verifiedUsersCount}</strong>
                      <span>Vérifiés</span>
                    </div>
                    <div>
                      <strong>{nonVerifiedUsersCount}</strong>
                      <span>À vérifier</span>
                    </div>
                    <div>
                      <strong>{contactMessages.length}</strong>
                      <span>Messages</span>
                    </div>
                  </footer>
                </article>
              </div>
            </section>
          ) : null}

          {activeAdminSection === 'contrats' ? (
            <section className="section admin-block">
              <div className="admin-table-toolbar">
                <h2>Consulter les contrats</h2>
                <div className="admin-table-toolbar-right">
                  <input
                    type="text"
                    className="admin-table-search"
                    placeholder="Rechercher..."
                    value={contratSearchTerm}
                    onChange={(event) => setContratSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>NOM AGENCE</th>
                      <th>CONTRAT</th>
                      <th>CIN</th>
                      <th>TYPE</th>
                      <th>STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContrats.map((contrat) => (
                      <tr key={contrat.id}>
                        <td>{contrat.nomAgence || <span style={{ color: '#4a5568', fontStyle: 'italic' }}>-</span>}</td>
                        <td>{contrat.numeroContrat || '-'}</td>
                        <td>{contrat.cin || '-'}</td>
                        <td>{contrat.typeContrat || '-'}</td>
                        <td>
                          <span className={`admin-status-pill ${getStatusClass(contrat.statut)}`}>
                            {contrat.statut || 'INCONNU'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {contrats.length === 0 ? <p className="auth-switch">Aucun contrat trouvé.</p> : null}
                {contrats.length > 0 && filteredContrats.length === 0 ? <p className="auth-switch">Aucun contrat pour cette recherche.</p> : null}
              </div>
            </section>
          ) : null}

          {activeAdminSection === 'utilisateurs' ? (
            <section className="section admin-block">
              <div className="admin-table-toolbar">
                <h2>Consulter les utilisateurs</h2>
                <div className="admin-table-toolbar-right">
                  <select
                    className="admin-table-search"
                    value={userAgenceVilleFilter}
                    onChange={(event) => setUserAgenceVilleFilter(event.target.value)}
                  >
                    <option value="">-- Toutes les villes --</option>
                    {villeOptions.map((ville) => (
                      <option key={ville} value={ville}>{ville}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="admin-table-search"
                    placeholder="Rechercher par CIN..."
                    value={userCinSearchTerm}
                    onChange={(event) => setUserCinSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>UTILISATEUR</th>
                      <th>CIN</th>
                      <th>EMAIL</th>
                      <th>TÉLÉPHONE</th>
                      <th>ROLE</th>
                      <th>STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUtilisateurs.map((utilisateur) => (
                      <tr key={utilisateur.id}>
                        <td>
                          <div className="admin-user-cell">
                            <span
                              className="admin-user-avatar"
                              style={{ backgroundColor: getAvatarColor(utilisateur.email || utilisateur.nom || utilisateur.id) }}
                            >
                              {getAvatarLabel(utilisateur.nom, utilisateur.email)}
                            </span>
                            <span>{utilisateur.nom || '-'}</span>
                          </div>
                        </td>
                        <td>{utilisateur.cin || '-'}</td>
                        <td>{utilisateur.email || '-'}</td>
                        <td>{utilisateur.telephone || '-'}</td>
                        <td>
                          <span className="admin-role-pill">{getRoleLabel(utilisateur)}</span>
                        </td>
                        <td>
                          <span className={`admin-status-pill ${getStatusClass(utilisateur.statutCompte)}`}>
                            {getStatusLabel(utilisateur.statutCompte)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {utilisateurs.length === 0 ? <p className="auth-switch">Aucun utilisateur trouvé.</p> : null}
                {utilisateurs.length > 0 && filteredUtilisateurs.length === 0 ? <p className="auth-switch">Aucun utilisateur pour ce filtre.</p> : null}
              </div>
            </section>
          ) : null}

          {activeAdminSection === 'messages' ? (
            <div style={{ marginTop: '20px' }}>
              <ChatPage />
            </div>
          ) : null}

          {activeAdminSection === 'publications' ? (
            <section className="section admin-block">
              <div className="admin-table-toolbar">
                <h2>Gestion des publications</h2>
                <div className="admin-table-toolbar-right">
                  <button
                    type="button"
                    className="admin-add-btn"
                    onClick={() => {
                      resetPublicationForm()
                      setIsPublicationModalOpen(true)
                    }}
                  >
                    + Ajouter
                  </button>
                  <input
                    type="text"
                    className="admin-table-search"
                    placeholder="Rechercher..."
                    value={publicationSearchTerm}
                    onChange={(event) => setPublicationSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>TITRE</th>
                      <th>CATÉGORIE</th>
                      <th>DATE</th>
                      <th>À LA UNE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPublications.map((publication) => (
                      <tr key={publication.id}>
                        <td>{publication.titre || '-'}</td>
                        <td>{publication.categorie || '-'}</td>
                        <td>{publication.datePublication ? formatDateTime(publication.datePublication) : '-'}</td>
                        <td>
                          <span className={`admin-status-pill ${publication.aLaUne ? 'history-status-open' : 'history-status-closed'}`}>
                            {publication.aLaUne ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-table-actions">
                            <button
                              type="button"
                              className="admin-action-btn admin-action-edit"
                              onClick={() => {
                                handleEditPublication(publication)
                                setIsPublicationModalOpen(true)
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-delete"
                              onClick={() => setPublicationToDelete(publication)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {publications.length === 0 ? <p className="auth-switch">Aucune publication trouvée.</p> : null}
                {publications.length > 0 && filteredPublications.length === 0 ? <p className="auth-switch">Aucune publication pour cette recherche.</p> : null}
              </div>
            </section>
          ) : null}

          {activeAdminSection === 'agences' ? (
            <section className="section admin-block">
              <div className="admin-table-toolbar">
                <h2>Gestion des agences</h2>
                <div className="admin-table-toolbar-right">
                  <button
                    type="button"
                    className="admin-add-btn"
                    onClick={() => {
                      resetAgenceForm()
                      setIsAgenceModalOpen(true)
                    }}
                  >
                    + Ajouter
                  </button>
                  <select
                    className="admin-table-search"
                    value={agenceVilleFilter}
                    onChange={(event) => setAgenceVilleFilter(event.target.value)}
                  >
                    <option value="">-- Toutes les villes --</option>
                    {villeOptions.map((ville) => (
                      <option key={ville} value={ville}>{ville}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>NOM AGENCE</th>
                      <th>VILLE</th>
                      <th>ADRESSE</th>
                      <th>TÉLÉPHONE</th>
                      <th>HORAIRES</th>
                      <th>AGENT</th>
                      <th>EMAIL AGENT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgences.map((agence) => (
                      <tr key={agence.id}>
                        <td><strong>{agence.nomAgence || '-'}</strong></td>
                        <td>{agence.ville || '-'}</td>
                        <td>{agence.adresse || '-'}</td>
                        <td>{agence.telephone || '-'}</td>
                        <td>{agence.horaires || '-'}</td>
                        <td>{agence.sotadmin || '-'}</td>
                        <td>{agence.emailSotadmin || '-'}</td>
                        <td>
                          <div className="admin-table-actions">
                            <button
                              type="button"
                              className="admin-action-btn admin-action-edit"
                              onClick={() => {
                                handleEditAgence(agence)
                                setIsAgenceModalOpen(true)
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-delete"
                              onClick={() => setAgenceToDelete(agence)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {agences.length === 0 ? <p className="auth-switch">Aucune agence trouvée.</p> : null}
                {agences.length > 0 && filteredAgences.length === 0 ? <p className="auth-switch">Aucune agence pour ce filtre de ville.</p> : null}
              </div>
            </section>
          ) : null}

          {activeAdminSection === 'documents' ? (
            <section className="section admin-block">
              <div className="admin-table-toolbar">
                <h2>Gestion des documents</h2>
                <div className="admin-table-toolbar-right">
                  <button
                    type="button"
                    className="admin-add-btn"
                    onClick={() => {
                      resetDocumentForm()
                      setIsDocumentModalOpen(true)
                    }}
                  >
                    + Ajouter
                  </button>
                  <input
                    type="text"
                    className="admin-table-search"
                    placeholder="Rechercher..."
                    value={documentSearchTerm}
                    onChange={(event) => setDocumentSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>TYPE</th>
                      <th>FICHIER</th>
                      <th>DATE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td><strong>{doc.typeDocument || '-'}</strong></td>
                        <td>{doc.fileName || '-'}</td>
                        <td>{doc.dateCreation ? formatDateTime(doc.dateCreation) : '-'}</td>
                        <td>
                          <div className="admin-table-actions">
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              className="admin-action-btn admin-action-edit"
                              style={{ textDecoration: 'none', textAlign: 'center' }}
                            >
                              Télécharger
                            </a>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-edit"
                              onClick={() => {
                                handleEditDocument(doc)
                                setIsDocumentModalOpen(true)
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-delete"
                              onClick={() => setDocumentToDelete(doc)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {documents.length === 0 ? <p className="auth-switch">Aucun document trouvé.</p> : null}
                {documents.length > 0 && filteredDocuments.length === 0 ? <p className="auth-switch">Aucun document pour cette recherche.</p> : null}
              </div>
            </section>
          ) : null}

        </div>

        {isDocumentModalOpen ? (
          <div className="admin-modal-overlay" onClick={() => setIsDocumentModalOpen(false)}>
            <div className="admin-modal-card admin-modal-card-success" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>{editingDocumentId ? 'Modifier document' : 'Nouveau document'}</h3>
                  <p>{editingDocumentId ? 'Mettre à jour le document' : 'Ajouter un PDF'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setIsDocumentModalOpen(false)}>X</button>
              </div>

              <form
                className="admin-modal-body admin-modal-form-grid"
                onSubmit={async (event) => {
                  const isSuccess = await handleSubmitDocument(event)
                  if (isSuccess) {
                    setIsDocumentModalOpen(false)
                  }
                }}
              >
                <label>
                  Type de document *
                  <select
                    name="typeDocument"
                    value={documentForm.typeDocument}
                    onChange={handleDocumentChange}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    <option value="voiture">Voiture</option>
                    <option value="habitation">Habitation</option>
                    <option value="voyage">Voyage</option>
                    <option value="prévoyance">Prévoyance</option>
                  </select>
                </label>

                <label className="admin-span-full">
                  Fichier PDF {editingDocumentId ? '(Optionnel si inchangé)' : '*'}
                  <input
                    type="file"
                    name="file"
                    accept=".pdf"
                    onChange={handleDocumentChange}
                    required={!editingDocumentId}
                  />
                </label>

                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsDocumentModalOpen(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="admin-modal-btn admin-modal-btn-success">
                    {editingDocumentId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {documentToDelete ? (
          <div className="admin-modal-overlay" onClick={() => setDocumentToDelete(null)}>
            <div className="admin-modal-card admin-modal-card-danger" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>Supprimer ce document ?</h3>
                  <p>{documentToDelete.fileName || '-'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setDocumentToDelete(null)}>X</button>
              </div>
              <div className="admin-modal-body">
                <p className="admin-modal-warning">Cette action est irréversible.</p>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setDocumentToDelete(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="admin-modal-btn admin-modal-btn-danger"
                    onClick={async () => {
                      const isSuccess = await handleDeleteDocument(documentToDelete.id)
                      if (isSuccess) {
                        setDocumentToDelete(null)
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isContratModalOpen ? (
          <div className="admin-modal-overlay" onClick={() => setIsContratModalOpen(false)}>
            <div className={`admin-modal-card ${editingContratId ? 'admin-modal-card-blue' : 'admin-modal-card-success'}`} onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>{editingContratId ? 'Modifier contrat' : 'Nouveau contrat'}</h3>
                  <p>{editingContratId ? 'Mettre à jour les informations contrat' : 'Créer un contrat'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setIsContratModalOpen(false)}>X</button>
              </div>

              <form
                className="admin-modal-body admin-modal-form-grid"
                onSubmit={async (event) => {
                  const isSuccess = await handleSubmitContrat(event)
                  if (isSuccess) {
                    setIsContratModalOpen(false)
                  }
                }}
              >
                <label>
                  Nom de l'agence
                  <input name="nomAgence" value={contratForm.nomAgence} onChange={handleContratChange} placeholder="Laisser vide si aucune agence" />
                </label>
                <label>
                  CIN *
                  <input name="cin" value={contratForm.cin} onChange={handleContratChange} required
                    inputMode="numeric" maxLength="8" pattern="\d{8}" placeholder="8 chiffres" title="CIN doit contenir exactement 8 chiffres" />
                </label>
                <label>
                  Numéro contrat *
                  <input name="numeroContrat" value={contratForm.numeroContrat} onChange={handleContratChange} required />
                </label>
                <label>
                  Code contrat
                  <input name="codeContrat" value={contratForm.codeContrat} onChange={handleContratChange} />
                </label>
                <label>
                  Type contrat
                  <select name="typeContrat" value={contratForm.typeContrat} onChange={handleContratChange}>
                    <option value="">Choisir un type</option>
                    {contractTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Date début
                  <input type="date" name="dateDebutContrat" value={contratForm.dateDebutContrat} onChange={handleContratChange} />
                </label>
                <label>
                  Date fin
                  <input type="date" name="dateFinContrat" value={contratForm.dateFinContrat} onChange={handleContratChange} />
                </label>

                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsContratModalOpen(false)}>
                    Annuler
                  </button>
                  <button type="submit" className={`admin-modal-btn ${editingContratId ? 'admin-modal-btn-primary' : 'admin-modal-btn-success'}`}>
                    {editingContratId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {contratToDelete ? (
          <div className="admin-modal-overlay" onClick={() => setContratToDelete(null)}>
            <div className="admin-modal-card admin-modal-card-danger" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>Supprimer ce contrat ?</h3>
                  <p>{contratToDelete.numeroContrat || '-'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setContratToDelete(null)}>X</button>
              </div>
              <div className="admin-modal-body">
                <p className="admin-modal-warning">Cette action est irréversible. Les données du contrat seront supprimées.</p>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setContratToDelete(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="admin-modal-btn admin-modal-btn-danger"
                    onClick={async () => {
                      const isSuccess = await handleDeleteContrat(contratToDelete.id)
                      if (isSuccess) {
                        setContratToDelete(null)
                      }
                    }}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}


        {isPublicationModalOpen ? (
          <div className="admin-modal-overlay" onClick={() => setIsPublicationModalOpen(false)}>
            <div className="admin-modal-card admin-modal-card-success" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>{editingPublicationId ? 'Modifier publication' : 'Nouvelle publication'}</h3>
                  <p>{editingPublicationId ? 'Mettre à jour la publication' : 'Créer une publication'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setIsPublicationModalOpen(false)}>X</button>
              </div>

              <form
                className="admin-modal-body admin-modal-form-grid"
                onSubmit={async (event) => {
                  const isSuccess = await handleSubmitPublication(event)
                  if (isSuccess) {
                    setIsPublicationModalOpen(false)
                  }
                }}
              >
                <label>
                  Titre *
                  <input name="titre" value={publicationForm.titre} onChange={handlePublicationChange} required />
                </label>
                <label>
                  Catégorie
                  <input name="categorie" value={publicationForm.categorie} onChange={handlePublicationChange} />
                </label>
                <label>
                  Date de publication
                  <input type="date" name="datePublication" value={publicationForm.datePublication} onChange={handlePublicationChange} />
                </label>
                <label>
                  URL de l'image
                  <input name="imageUrl" value={publicationForm.imageUrl} onChange={handlePublicationChange} placeholder="https://..." />
                </label>
                <label className="admin-span-full">
                  Description
                  <textarea name="description" value={publicationForm.description} onChange={handlePublicationChange} rows={4} />
                </label>
                <label className="admin-modal-checkbox admin-span-full">
                  <input type="checkbox" name="aLaUne" checked={publicationForm.aLaUne} onChange={handlePublicationChange} />
                  À la une
                </label>

                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsPublicationModalOpen(false)}>
                    Annuler
                  </button>
                  <button type="submit" className={`admin-modal-btn ${editingPublicationId ? 'admin-modal-btn-primary' : 'admin-modal-btn-success'}`}>
                    {editingPublicationId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {publicationToDelete ? (
          <div className="admin-modal-overlay" onClick={() => setPublicationToDelete(null)}>
            <div className="admin-modal-card admin-modal-card-danger" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>Supprimer cette publication ?</h3>
                  <p>{publicationToDelete.titre || '-'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setPublicationToDelete(null)}>X</button>
              </div>
              <div className="admin-modal-body">
                <p className="admin-modal-warning">Cette action est irréversible. La publication sera supprimée.</p>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setPublicationToDelete(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="admin-modal-btn admin-modal-btn-danger"
                    onClick={async () => {
                      const isSuccess = await handleDeletePublication(publicationToDelete.id)
                      if (isSuccess) {
                        setPublicationToDelete(null)
                      }
                    }}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isAgenceModalOpen ? (
          <div className="admin-modal-overlay" onClick={() => setIsAgenceModalOpen(false)}>
            <div className="admin-modal-card admin-modal-card-success" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>{editingAgenceId ? 'Modifier agence' : 'Nouvelle agence'}</h3>
                  <p>{editingAgenceId ? 'Mettre à jour l\'agence' : 'Créer une agence'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setIsAgenceModalOpen(false)}>X</button>
              </div>

              <form
                className="admin-modal-body admin-modal-form-grid"
                onSubmit={async (event) => {
                  const isSuccess = await handleSubmitAgence(event)
                  if (isSuccess) {
                    setIsAgenceModalOpen(false)
                  }
                }}
              >
                <label>
                  Nom de l'agence
                  <input name="nomAgence" value={agenceForm.nomAgence} readOnly />
                </label>
                <label>
                  Ville
                  <select name="ville" value={agenceForm.ville} onChange={handleAgenceChange}>
                    <option value="">-- Sélectionner une ville --</option>
                    {villeOptions.map((ville) => (
                      <option key={ville} value={ville}>{ville}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Adresse
                  <input name="adresse" value={agenceForm.adresse} onChange={handleAgenceChange} />
                </label>
                <label>
                  Téléphone
                  <input name="telephone" value={agenceForm.telephone} onChange={handleAgenceChange} inputMode="tel" />
                </label>
                <label>
                  Horaires
                  <input name="horaires" value={agenceForm.horaires} onChange={handleAgenceChange} />
                </label>
                <label>
                  Nom de l'agent
                  <input name="sotadmin" value={agenceForm.sotadmin} onChange={handleAgenceChange} />
                </label>
                <label>
                  Email de l'agent
                  <input name="emailSotadmin" type="email" value={agenceForm.emailSotadmin} onChange={handleAgenceChange} />
                </label>
                <label>
                  Mot de passe de l'agent
                  <input name="password" type="password" value={agenceForm.password} onChange={handleAgenceChange} placeholder="Laisser vide si inchangé" />
                </label>
                <input type="hidden" name="roleSotadmin" value="AGENT" />

                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setIsAgenceModalOpen(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="admin-modal-btn admin-modal-btn-success">
                    {editingAgenceId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {agenceToDelete ? (
          <div className="admin-modal-overlay" onClick={() => setAgenceToDelete(null)}>
            <div className="admin-modal-card admin-modal-card-danger" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <h3>Supprimer cette agence ?</h3>
                  <p>{agenceToDelete.ville || '-'}</p>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setAgenceToDelete(null)}>X</button>
              </div>
              <div className="admin-modal-body">
                <p className="admin-modal-warning">Cette action est irréversible. Les données agence seront supprimées.</p>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-modal-btn admin-modal-btn-neutral" onClick={() => setAgenceToDelete(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="admin-modal-btn admin-modal-btn-danger"
                    onClick={async () => {
                      const isSuccess = await handleDeleteAgence(agenceToDelete.id)
                      if (isSuccess) {
                        setAgenceToDelete(null)
                      }
                    }}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

    </main>
  )
}
