import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

const ALLOWED_TYPES = ['AUTO', 'HABITATION', 'VOYAGE', 'PREVOYANCE']
/** En dev, requêtes via le proxy Vite (`/api` → 8080) : même origine, multipart fiable */
const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8080'
const DEFAULT_VISION_MODEL = 'LLAMA_3_2_11B_VISION'

const TYPE_LABELS = {
  AUTO: 'Accident automobile',
  HABITATION: 'Sinistre habitation',
  VOYAGE: 'Sinistre voyage',
  PREVOYANCE: 'Sinistre prévoyance'
}

const createInitialForm = (typeSinistre = 'AUTO') => ({
  typeSinistre,
  numeroContrat: '',
  dateIncident: '',
  lieuIncident: '',
  description: ''
})

const getTodayString = () => new Date().toISOString().split('T')[0]

// ── Helpers to parse NVIDIA JSON response ────────────────────────────
const parseDecision = (decision) => {
  const map = {
    AUTO_APPROVED: { label: 'Approuvé automatiquement', color: '#22c55e' },
    AUTO_REJECTED: { label: 'Rejeté automatiquement', color: '#ef4444' },
    MANUAL_REVIEW: { label: 'En révision manuelle', color: '#f59e0b' }
  }
  return map[decision] || { label: decision || 'En cours d\'analyse', color: '#6366f1' }
}

const parseFraudRisk = (risk) => {
  const map = { NONE: '✅ Aucun', LOW: '🟡 Faible', MEDIUM: '🟠 Moyen', HIGH: '🔴 Élevé' }
  return map[risk] || risk || 'N/A'
}

/** Extrait le premier objet JSON valide de la réponse IA (markdown, texte autour, etc.) */
const extractAiJson = (raw) => {
  if (raw == null || typeof raw !== 'string') return null
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1)
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

const formatGlobalConfidence = (parsed) => {
  const v = parsed?.globalConfidenceScore
  if (v === undefined || v === null || Number.isNaN(Number(v))) return 'Non communiquée'
  const n = Number(v)
  if (n <= 0 && parsed?.finalDecision === 'MANUAL_REVIEW') return 'En attente d\'analyse complète'
  const pct = Math.round(n * 100)
  return `${pct}%`
}

const formatCoverage = (parsed) => {
  const v = parsed?.coveragePercentageApplied
  if (v === undefined || v === null || Number.isNaN(Number(v))) {
    return parsed?.finalDecision === 'MANUAL_REVIEW' ? 'À préciser après examen' : null
  }
  const n = Number(v)
  if (n <= 0) return parsed?.finalDecision === 'MANUAL_REVIEW' ? 'À préciser après examen' : '0%'
  return `${Math.round(n * 100)}%`
}

/** Carte pour afficher la réponse brute des endpoints analyze-claim / analyze-image */
function PreAnalysisCard({ title, subtitle, response }) {
  if (!response || response.content == null || response.content === '') return null
  const parsed = extractAiJson(response.content)
  const ok = response.success !== false
  /** Réponse « image » : souvent markdown + JSON en fin — on privilégie le rendu markdown */
  const looksLikeImageMarkdown = /\*\*[^*]+\*\*/.test(response.content)
  const showJsonOnly = parsed && !looksLikeImageMarkdown

  return (
    <div className="pre-analysis-card">
      <div className="pre-analysis-card-head">
        <h4>{title}</h4>
        {response.modelUsed && (
          <span className="pre-analysis-chip" title={response.modelUsed}>
            {response.modelUsed}
          </span>
        )}
        <span className={ok ? 'pre-analysis-chip pre-analysis-chip--ok' : 'pre-analysis-chip pre-analysis-chip--err'}>
          {ok ? 'Succès' : 'Échec'}
        </span>
      </div>
      {subtitle && (
        <p className="text-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.88rem' }}>{subtitle}</p>
      )}
      {showJsonOnly ? (
        <pre className="pre-analysis-json-preview">{JSON.stringify(parsed, null, 2)}</pre>
      ) : (
        <div className="pre-analysis-md">
          <ReactMarkdown>{response.content}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default function DeclarationSinistrePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedType = useMemo(() => {
    const type = (searchParams.get('type') || '').toUpperCase()
    return ALLOWED_TYPES.includes(type) ? type : 'AUTO'
  }, [searchParams])

  const [form, setForm] = useState(() => createInitialForm(selectedType))
  const [photos, setPhotos] = useState([])
  const [contratFile, setContratFile] = useState(null)
  const [constatFile, setConstatFile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('') // message shown during loading
  const [aiResult, setAiResult] = useState(null)     // parsed NVIDIA response
  const [savedSinistre, setSavedSinistre] = useState(null) // DB save result
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const photoInputRef = useRef(null)
  const contratInputRef = useRef(null)
  const constatInputRef = useRef(null)
  const docInputRef = useRef(null)

  // ── Load user profile on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) { navigate('/login'); return }
      try {
        const res = await axios.get(`${API_BASE}/api/utilisateurs/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUserProfile(res.data)
        setForm(prev => ({
          ...prev,
          numeroContrat: res.data.numeroContrat || '',
          typeSinistre: selectedType
        }))
      } catch (err) {
        console.error('Erreur profile:', err)
        setError('Impossible de charger votre profil. Veuillez vous reconnecter.')
      }
    }
    fetchProfile()
  }, [selectedType, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Submit handler: DB save → NVIDIA AI analysis ─────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setAiResult(null)
    setSavedSinistre(null)

    if (form.dateIncident > getTodayString()) {
      setError("La date de l'incident ne peut pas être une date future.")
      setIsLoading(false)
      return
    }
    if (!contratFile) {
      setError('Veuillez joindre le contrat d’assurance (PDF/TXT).')
      setIsLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (!token || !userProfile) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setIsLoading(false)
      return
    }

    try {
      let preImageContent = null
      let preClaimContent = null
      let preConstatContent = null
      let preImageResponse = null
      let preClaimResponse = null
      let preConstatResponse = null
      const primaryPhoto = photos.length > 0 && photos[0]?.size > 0 ? photos[0] : null

      // ── STEP 1: Analyze image (endpoint dédié) ─────────────────────
      if (primaryPhoto) {
        setLoadingStep('🖼️ Analyse de la photo du sinistre...')
        const imageForm = new FormData()
        imageForm.append('image', primaryPhoto, primaryPhoto.name || 'photo.jpg')
        imageForm.append('model', DEFAULT_VISION_MODEL)
        imageForm.append('prompt', `Analyse photo sinistre ${form.typeSinistre}. Retourne un JSON structuré et factuel.`)
        const imageRes = await axios.post(`${API_BASE}/api/assistant/v1/analyze-image`, imageForm, {
          headers: { Authorization: `Bearer ${token}` }
        })
        preImageResponse = imageRes?.data ?? null
        preImageContent = preImageResponse?.content || null
      }

      // ── STEP 2: Analyze constat (AUTO uniquement) ───────────────────────
      if (form.typeSinistre === 'AUTO' && constatFile && constatFile.size > 0) {
        setLoadingStep('🧾 Analyse du constat amiable...')
        const constatForm = new FormData()
        constatForm.append('constat', constatFile, constatFile.name || 'constat.pdf')
        constatForm.append('claimType', form.typeSinistre)
        constatForm.append(
          'claimDescription',
          `Lieu: ${form.lieuIncident}\nDate: ${form.dateIncident}\nDescription: ${form.description}`
        )
        const constatRes = await axios.post(`${API_BASE}/api/assistant/v1/analyze-constat`, constatForm, {
          headers: { Authorization: `Bearer ${token}` }
        })
        preConstatResponse = constatRes?.data ?? null
        preConstatContent = preConstatResponse?.content || null
      }

      // ── STEP 3: Analyze claim (pipeline dédié), 1 retry si échec réseau/API ─
      setLoadingStep('🧠 Pré-analyse NVIDIA du dossier...')
      const claimDescriptionForPre = [
        `Type: ${form.typeSinistre}`,
        `Lieu: ${form.lieuIncident}`,
        `Date: ${form.dateIncident}`,
        `Description: ${form.description}`
      ].join('\n')
      const postAnalyzeClaim = () => {
        const claimForm = new FormData()
        claimForm.append('claimDescription', claimDescriptionForPre)
        claimForm.append('claimType', form.typeSinistre)
        claimForm.append('contractSummary', form.numeroContrat || '')
        if (contratFile) claimForm.append('legalDocumentText', contratFile.name || 'contrat.pdf')
        claimForm.append('ragContext', form.typeSinistre === 'AUTO'
          ? (preConstatContent || (constatFile?.name ? `Constat fourni: ${constatFile.name}` : 'Constat non fourni'))
          : 'Sinistre hors accident automobile')
        claimForm.append('insuredId', userProfile.cin || 'unknown')
        if (primaryPhoto) claimForm.append('damageImage', primaryPhoto, primaryPhoto.name || 'photo.jpg')
        return axios.post(`${API_BASE}/api/assistant/v1/analyze-claim`, claimForm, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      try {
        const claimRes = await postAnalyzeClaim()
        preClaimResponse = claimRes?.data ?? null
        preClaimContent = preClaimResponse?.content || null
      } catch (claimErr) {
        console.warn('Pré-analyse sinistre — nouvel essai…', claimErr)
        await new Promise((r) => setTimeout(r, 500))
        const claimRes2 = await postAnalyzeClaim()
        preClaimResponse = claimRes2?.data ?? null
        preClaimContent = preClaimResponse?.content || null
      }

      // ── STEP 4: Save sinistre in DB + orchestration ─────────────────
      setLoadingStep('💾 Enregistrement du sinistre...')
      const formData = new FormData()
      formData.append('cin', userProfile.cin)
      formData.append('typeSinistre', form.typeSinistre)
      formData.append('description', form.description)
      formData.append('preClaimAnalysis', preClaimContent ?? '')
      formData.append('preImageAnalysis', preImageContent ?? '')
      formData.append('preConstatAnalysis', preConstatContent ?? '')
      formData.append('lieu', form.lieuIncident)
      formData.append('date', `${form.dateIncident}T00:00:00`)
      // Fichiers : 3e argument = nom de fichier (obligatoire pour que Spring reçoive les parts)
      photos.forEach((file) => {
        if (file && file.size > 0) {
          formData.append('images', file, file.name || 'photo.jpg')
        }
      })
      if (photos.length > 0 && photos[0]?.size > 0) {
        formData.append('image', photos[0], photos[0].name || 'photo.jpg')
      }
      if (contratFile && contratFile.size > 0) {
        formData.append('contrat', contratFile, contratFile.name || 'contrat.pdf')
      }
      if (constatFile && constatFile.size > 0) {
        formData.append('constat', constatFile, constatFile.name || 'constat.pdf')
      }
      documents.forEach((file) => {
        if (file && file.size > 0) {
          formData.append('documents', file, file.name || 'document.pdf')
        }
      })

      const saveRes = await axios.post(`${API_BASE}/api/sinistres/declarer`, formData, {
        headers: { Authorization: `Bearer ${token}` },
        // Laisse le navigateur définir multipart + boundary (axios ne doit pas forcer Content-Type)
        transformRequest: [(data, headers) => {
          if (headers) {
            delete headers['Content-Type']
            delete headers['content-type']
          }
          return data
        }],
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })
      const sinistreData = saveRes.data
      setSavedSinistre(sinistreData)

      // ── STEP 2: Extraction de l'analyse IA déjà effectuée par le backend ─
      setLoadingStep('🤖 Lecture de l\'analyse IA NVIDIA...')

      // Parse the JSON string NVIDIA returns inside `aiAnalysis`
      let parsedContent = null
      if (sinistreData.aiAnalysis) {
        parsedContent = extractAiJson(sinistreData.aiAnalysis)
        if (!parsedContent) console.warn('Échec du parsing JSON de l\'analyse IA')
      }

      setAiResult({
        raw: { content: sinistreData.aiAnalysis },
        parsed: parsedContent,
        preClaim: preClaimResponse,
        preImage: preImageResponse,
        preConstat: preConstatResponse
      })

      setForm(createInitialForm(selectedType))
      setPhotos([])
      setContratFile(null)
      setConstatFile(null)
      setDocuments([])
      if (photoInputRef.current) photoInputRef.current.value = ''
      if (contratInputRef.current) contratInputRef.current.value = ''
      if (constatInputRef.current) constatInputRef.current.value = ''
      if (docInputRef.current) docInputRef.current.value = ''

    } catch (err) {
      console.error('Erreur déclaration:', err)
      const msg = err.response?.data?.message || err.response?.data || "Une erreur est survenue lors de la déclaration."
      setError(msg)
    } finally {
      setIsLoading(false)
      setLoadingStep('')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  const decisionInfo = aiResult?.parsed?.finalDecision
    ? parseDecision(aiResult.parsed.finalDecision)
    : null

  return (
    <main className="sinistre-page">
      {/* ── Hero ── */}
      <section className="section container products-section">
        <p className="section-kicker">Déclaration sinistre</p>
        <h1 className="section-title">Déclarez votre dossier en ligne</h1>
        <p className="text-muted sinistre-intro">
          Chargez vos justificatifs et photos. Notre IA <strong>NVIDIA</strong> analyse votre dossier
          instantanément pour accélérer le traitement.
        </p>
      </section>

      {/* ── Form card ── */}
      <section className="section container">
        <article className="auth-card sinistre-card">
          <h2>Formulaire de déclaration — {TYPE_LABELS[form.typeSinistre] || form.typeSinistre}</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Type */}
            <label>
              Type de sinistre
              <select name="typeSinistre" value={form.typeSinistre} onChange={handleChange}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>

            {/* Contrat */}
            <label>
              Numéro de contrat
              <input
                name="numeroContrat"
                value={form.numeroContrat}
                onChange={handleChange}
                placeholder="Ex: CTR-2026-001"
                required
              />
            </label>

            {/* Date */}
            <label>
              Date de l'incident
              <input
                type="date"
                name="dateIncident"
                value={form.dateIncident}
                onChange={handleChange}
                max={getTodayString()}
                required
              />
            </label>

            {/* Lieu */}
            <label>
              Lieu de l'incident
              <input
                name="lieuIncident"
                value={form.lieuIncident}
                onChange={handleChange}
                placeholder="Ville, adresse..."
                required
              />
            </label>

            {/* Description */}
            <label>
              Description du sinistre
              <textarea
                className="contact-textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Expliquez ce qui s'est passé avec le plus de détails possible..."
                required
              />
            </label>

            {/* Uploads */}
            <div className="sinistre-upload-grid">
              <label>
                📷 Photos du dommage
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setPhotos(Array.from(e.target.files || []))}
                />
                <small style={{ color: photos.length > 0 ? '#22c55e' : 'inherit' }}>
                  {photos.length > 0 ? `✅ ${photos.length} photo(s) — analysée(s) par IA vision` : 'Aucune photo sélectionnée'}
                </small>
              </label>

              <label>
                📘 Contrat d&apos;assurance (obligatoire)
                <input
                  ref={contratInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={e => setContratFile(e.target.files?.[0] || null)}
                  required
                />
                <small style={{ color: contratFile ? '#22c55e' : 'inherit' }}>
                  {contratFile ? `✅ ${contratFile.name}` : 'Ajoutez votre contrat pour calculer la couverture et l’indemnisation'}
                </small>
              </label>

              {form.typeSinistre === 'AUTO' && (
                <label>
                  🧾 Constat amiable (optionnel pour accident voiture)
                  <input
                    ref={constatInputRef}
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain,image/*"
                    onChange={e => setConstatFile(e.target.files?.[0] || null)}
                  />
                  <small style={{ color: constatFile ? '#22c55e' : 'inherit' }}>
                    {constatFile ? `✅ ${constatFile.name}` : 'Optionnel : améliore la validation de la déclaration en cas d’accident'}
                  </small>
                </label>
              )}

              <label>
                📄 Pièces complémentaires (facture, devis...)
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  onChange={e => setDocuments(Array.from(e.target.files || []))}
                />
                <small style={{ color: documents.length > 0 ? '#22c55e' : 'inherit' }}>
                  {documents.length > 0 ? `✅ ${documents.length} document(s)` : 'Aucun document sélectionné'}
                </small>
              </label>
            </div>

            <button type="submit" className="primary auth-submit" disabled={isLoading}>
              {isLoading ? loadingStep || 'Analyse en cours...' : '🚀 Envoyer et analyser avec NVIDIA AI'}
            </button>
          </form>

          {/* Error */}
          {error && <p className="auth-switch error-message">{error}</p>}

          {/* DB save confirmation (shown while AI is running) */}
          {savedSinistre && !aiResult && isLoading && (
            <div className="ai-result-card" style={{ borderColor: '#6366f1', marginTop: '1.5rem' }}>
              <p style={{ color: '#6366f1', fontWeight: 600 }}>
                ✅ Sinistre enregistré (ref: {savedSinistre.id?.slice(-8) || 'N/A'}) — Analyse NVIDIA en cours...
              </p>
            </div>
          )}
        </article>
      </section>

      {/* ── AI Result: pré-analyses + synthèse finale ── */}
      {aiResult && (
        <section className="section container">
          {(aiResult.preClaim || aiResult.preImage || aiResult.preConstat) && (
            <div className="pre-analysis-section pre-analysis-section--wide">
              <h3 className="pre-analysis-section-title">🔬 Pré-analyses NVIDIA (étapes intermédiaires)</h3>
              <p className="text-muted pre-analysis-section-lead">
                Pré-analyse sinistre, analyse du constat et analyse de l&apos;image sont affichées <strong>séparément</strong> ci-dessous.
                La <strong>synthèse finale</strong> (plus bas) combine ces résultats avec votre déclaration.
              </p>
              <div className="pre-analysis-grid pre-analysis-grid--split">
                <PreAnalysisCard
                  title="📋 Pré-analyse sinistre"
                  subtitle="POST /api/assistant/v1/analyze-claim — pipeline couverture + synthèse"
                  response={aiResult.preClaim}
                />
                <PreAnalysisCard
                  title="🧾 Analyse du constat (responsabilité)"
                  subtitle="POST /api/assistant/v1/analyze-constat — validité et qui est en tort"
                  response={aiResult.preConstat}
                />
                <PreAnalysisCard
                  title="🖼️ Analyse de l’image"
                  subtitle="POST /api/assistant/v1/analyze-image — vision (dommages, cohérence)"
                  response={aiResult.preImage}
                />
              </div>
            </div>
          )}

          <article className="ai-result-card" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h3 className="ai-result-title">⚡ Synthèse finale — déclaration enregistrée</h3>

            {/* Quick save confirmation */}
            {savedSinistre && (
              <p style={{ color: '#22c55e', marginBottom: '1rem' }}>
                ✅ Dossier enregistré avec le statut <strong>{savedSinistre.statut}</strong>
                {savedSinistre.typeSinistre && ` · ${savedSinistre.typeSinistre}`}
              </p>
            )}

            {aiResult.parsed ? (
              <div className="ai-result-content">
                {(aiResult.parsed.executiveSummary || (Array.isArray(aiResult.parsed.synthesisBullets) && aiResult.parsed.synthesisBullets.length)) && (
                  <div className="ai-synthesis-block">
                    {aiResult.parsed.executiveSummary && (
                      <>
                        <p className="ai-synthesis-block__label">Synthèse (pré-analyse sinistre + analyse image)</p>
                        <div className="ai-synthesis-block__summary">{aiResult.parsed.executiveSummary}</div>
                      </>
                    )}
                    {Array.isArray(aiResult.parsed.synthesisBullets) && aiResult.parsed.synthesisBullets.length > 0 && (
                      <ul className="ai-synthesis-block__bullets">
                        {aiResult.parsed.synthesisBullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {(aiResult.parsed.liabilityConclusion || aiResult.parsed.insuredAtFault !== undefined) && (
                  <div className="ai-confidence-badge" style={{ marginBottom: '1rem', background: 'rgba(245,158,11,0.12)' }}>
                    Responsabilité : <strong>{aiResult.parsed.liabilityConclusion || (aiResult.parsed.insuredAtFault ? 'Assuré en tort' : 'Assuré non en tort')}</strong>
                  </div>
                )}
                {/* Decision badge */}
                {decisionInfo && (
                  <div style={{
                    display: 'inline-block',
                    background: decisionInfo.color,
                    color: '#fff',
                    padding: '6px 18px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    marginBottom: '1.25rem'
                  }}>
                    {decisionInfo.label}
                  </div>
                )}

                {/* Key metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="ai-confidence-badge">
                    Confiance globale : {formatGlobalConfidence(aiResult.parsed)}
                  </div>
                  {aiResult.parsed.fraudRiskLevel && (
                    <div className="ai-confidence-badge" style={{ background: 'rgba(239,68,68,0.1)' }}>
                      Risque fraude : {parseFraudRisk(aiResult.parsed.fraudRiskLevel)}
                    </div>
                  )}
                  {aiResult.parsed.finalIndemnificationAmount != null && (
                    <div className="ai-confidence-badge" style={{ background: 'rgba(34,197,94,0.1)' }}>
                      Indemnisation estimée : <strong>{aiResult.parsed.finalIndemnificationAmount.toLocaleString()} {aiResult.parsed.currency || 'TND'}</strong>
                    </div>
                  )}
                  {formatCoverage(aiResult.parsed) && (
                    <div className="ai-confidence-badge">
                      Couverture appliquée : {formatCoverage(aiResult.parsed)}
                    </div>
                  )}
                </div>

                {/* Message to insured */}
                {aiResult.parsed.insuredNotification?.body && (
                  <div style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                      {aiResult.parsed.insuredNotification.subject}
                    </p>
                    <div className="ai-analysis-text">{aiResult.parsed.insuredNotification.body}</div>
                  </div>
                )}

                {/* Internal audit note — shown only if manual review */}
                {aiResult.parsed.finalDecision === 'MANUAL_REVIEW' && aiResult.parsed.internalAuditNote && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '10px',
                    padding: '1rem'
                  }}>
                    <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>📋 Note de révision</p>
                    <p className="ai-analysis-text">{aiResult.parsed.internalAuditNote}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback: raw content display if JSON parse failed */
              <div className="ai-analysis-text" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                {aiResult.raw.content || JSON.stringify(aiResult.raw, null, 2)}
              </div>
            )}

            <p className="ai-status-note" style={{ marginTop: '1.5rem' }}>
              Un agent humain validera ces informations prochainement.
              Référence dossier&nbsp;: <strong>{savedSinistre?.id?.slice(-8) || 'N/A'}</strong>
            </p>
          </article>
        </section>
      )}
    </main>
  )
}
