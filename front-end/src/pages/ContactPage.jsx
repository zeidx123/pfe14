import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function ContactPage() {
    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        sujet: '',
        message: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const token = localStorage.getItem('token')
    const isAuthenticated = Boolean(token)

    useEffect(() => {
        if (!isAuthenticated) {
            setFormData((prev) => ({ ...prev, nom: '', email: '' }))
            return
        }

        const localNom = localStorage.getItem('userDisplayName') || ''
        const localEmail = localStorage.getItem('userEmail') || ''

        setFormData((prev) => ({
            ...prev,
            nom: localNom,
            email: localEmail
        }))

        fetch('/api/utilisateurs/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Profil indisponible')
                }
                return response.json()
            })
            .then((data) => {
                const nom = data?.nom?.trim() || localNom
                const email = data?.email || localEmail

                setFormData((prev) => ({
                    ...prev,
                    nom,
                    email
                }))

                if (nom) {
                    localStorage.setItem('userDisplayName', nom)
                }

                if (email) {
                    localStorage.setItem('userEmail', email)
                }
            })
            .catch(() => {
                // Keep fallback values from localStorage.
            })
    }, [isAuthenticated, token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!isAuthenticated) {
            setError('Vous devez vous connecter avant d\'envoyer un message.')
            return
        }

        if (!formData.nom.trim() || !formData.email.trim()) {
            setError('Impossible de récupérer votre nom/email. Reconnectez-vous puis réessayez.')
            return
        }

        if (!formData.sujet.trim() || !formData.message.trim()) {
            setError('Veuillez remplir le sujet et le message.')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact-messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(data?.message || 'Impossible d\'envoyer le message.')
            }

            setSuccess('Merci ! Votre message a été envoyé avec succès.')
            setFormData((prev) => ({ ...prev, sujet: '', message: '' }))
        } catch (submitError) {
            setError(submitError.message || 'Erreur lors de l\'envoi du message.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="contact-page">
            <section className="section container products-section">
                <p className="section-kicker">Contact</p>
                <h1 className="section-title">Besoin d'un renseignement ? Contactez-nous</h1>
            </section>

            <section className="section container">
                <div className="contact-layout">
                    <div className="auth-card contact-form-card">
                        <h2>Écrivez-nous</h2>

                        {!isAuthenticated ? (
                            <p className="contact-login-warning">
                                Connectez-vous pour envoyer votre message. <Link to="/se-connecter">Se connecter</Link>
                            </p>
                        ) : null}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <label>
                                Sujet
                                <input
                                    type="text"
                                    placeholder="Objet de votre message"
                                    required
                                    value={formData.sujet}
                                    onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                                />
                            </label>
                            <label>
                                Message
                                <textarea
                                    className="contact-textarea"
                                    placeholder="Comment pouvons-nous vous aider ?"
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                            </label>
                            {error ? <p className="auth-switch">{error}</p> : null}
                            {success ? <p className="auth-switch">{success}</p> : null}
                            <button
                                type="submit"
                                className="nav-btn primary-btn auth-submit"
                                disabled={!isAuthenticated || isSubmitting}
                            >
                                {isSubmitting ? 'Envoi...' : 'Envoyer le message'}
                            </button>
                        </form>
                    </div>

                    <div className="contact-info-grid">
                        <div className="product-card contact-info-card">
                            <h4>📍 Siège Social</h4>
                            <p>9 rue de Palestine cité des affaires</p>
                            <p>Kheireddine 2060 La Goulette</p>
                        </div>
                        <div className="product-card contact-info-card">
                            <h4>📞 Téléphone</h4>
                            <p>Standard: 70 255 000</p>
                            <p>Assistance: 70 255 001</p>
                        </div>
                        <div className="product-card contact-info-card">
                            <h4>📧 Email</h4>
                            <p>contact@assurgo.tn</p>
                            <p>support@assurgo.tn</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
