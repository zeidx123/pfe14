import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const garanties = [
  {
    icon: '🌍',
    title: 'Assistance internationale',
    desc: 'Bénéficiez d’une assistance avant et pendant vos voyages à l’étranger.'
  },
  {
    icon: '🩺',
    title: 'Frais médicaux',
    desc: 'Prise en charge des frais médicaux urgents durant votre séjour.'
  },
  {
    icon: '🧳',
    title: 'Bagages protégés',
    desc: 'Couverture en cas de perte, vol ou retard de vos bagages.'
  }
]

const services = [
  {
    title: 'Attestation rapide',
    desc: 'Recevez votre attestation d’assurance voyage en quelques instants.',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Assistance santé',
    desc: 'Un réseau d’assistance disponible pour orienter vos soins à l’étranger.',
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Support 24/7',
    desc: 'Contactez nos équipes jour et nuit pour une aide immédiate.',
    img: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80'
  }
]

const chiffres = [
  { value: '24/7', label: 'Assistance voyage' },
  { value: '120+', label: 'Pays couverts' },
  { value: '2h', label: 'Réponse initiale' },
  { value: '96%', label: 'Satisfaction client' }
]

const etapes = [
  {
    step: '01',
    title: 'Déclarer l incident',
    desc: 'Signalez rapidement le sinistre voyage avec les informations de votre séjour.'
  },
  {
    step: '02',
    title: 'Uploader les pièces',
    desc: 'Ajoutez billets, factures et justificatifs médicaux si nécessaires.'
  },
  {
    step: '03',
    title: 'Décision du dossier',
    desc: 'Recevez la décision et le montant proposé après analyse de votre dossier.'
  }
]

export default function MonVoyagePage() {
  const [hasContract, setHasContract] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkContract = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const response = await axios.get('http://localhost:8080/api/utilisateurs/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const contracts = response.data.contrats || []
        const exists = contracts.some(c =>
          c.typeContrat?.toLowerCase() === 'voyage'
        )
        setHasContract(exists)
      } catch (err) {
        console.error("Check contract error:", err)
      } finally {
        setIsLoading(false)
      }
    }
    checkContract()
  }, [])

  const renderDeclareBtn = (className = "nav-btn primary-btn devis-btn") => {
    if (isLoading) return <button className={className} disabled>Vérification...</button>
    if (!hasContract) return (
      <button
        className={`${className} btn-disabled`}
        title="Vous devez posséder un contrat voyage pour déclarer un sinistre."
        disabled
      >
        Déclarer un sinistre
      </button>
    )
    return (
      <Link to="/declaration-sinistre?type=VOYAGE" className={className}>
        Déclarer un sinistre
      </Link>
    )
  }

  return (
    <main>
      <section className="section container products-section">
        <p className="section-kicker">Mon voyage</p>
        <h1 className="section-title">Voyagez sereinement avec AssurGo</h1>
        <div className="news-block">
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80"
            alt="Assurance voyage"
          />
          <div>
            <p className="news-tag">Protection voyage</p>
            <h4>Une assistance complète avant et pendant votre séjour</h4>
            <p>Protégez vos déplacements avec des garanties adaptées à vos besoins de mobilité.</p>
            {renderDeclareBtn()}
          </div>
        </div>
      </section>

      <section className="section container">
        <p className="section-kicker">Nos garanties</p>
        <div className="product-grid">
          {garanties.map((item) => (
            <article className="product-card" key={item.title}>
              <span className="product-icon">{item.icon}</span>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section container">
        <p className="section-kicker">Services voyage</p>
        <h2 className="section-title">Des services utiles à chaque destination</h2>
        <div className="demarche-grid">
          {services.map((item) => (
            <article className="demarche-card" key={item.title}>
              <img src={item.img} alt={item.title} />
              <div className="demarche-body">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section container offer-flow-section">
        <p className="section-kicker">Parcours sinistre</p>
        <h2 className="section-title">Comment traiter votre dossier voyage</h2>
        <div className="offer-flow-grid">
          {etapes.map((item) => (
            <article className="offer-flow-card" key={item.step}>
              <span className="offer-flow-step">{item.step}</span>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container stats-layout">
          <div>
            <h2 className="section-title left">Obtenir mon attestation voyage</h2>
            <p className="text-muted">
              Accédez à vos documents et suivez vos demandes directement depuis votre espace client.
            </p>
            {renderDeclareBtn("nav-btn primary-btn")}
          </div>
          <div className="stats-grid-2">
            {chiffres.map((item) => (
              <article className="stat-box" key={item.label}>
                <h4>{item.value}</h4>
                <p>{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
