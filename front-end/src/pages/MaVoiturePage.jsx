import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const garanties = [
  {
    icon: '🛡️',
    title: 'Responsabilité civile',
    desc: 'Protection essentielle pour couvrir les dommages causés à des tiers.'
  },
  {
    icon: '🚘',
    title: 'Tous risques',
    desc: 'Une couverture complète pour protéger votre véhicule au quotidien.'
  },
  {
    icon: '🛠️',
    title: 'Assistance 24/7',
    desc: 'Une aide rapide partout en Tunisie en cas de panne ou d’accident.'
  }
]

const services = [
  {
    title: 'Déclaration rapide',
    desc: 'Déclarez votre sinistre auto en quelques minutes depuis votre espace client.',
    img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Remorquage & assistance',
    desc: 'Bénéficiez d’une assistance 24/7 en cas de panne, accident ou immobilisation.',
    img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Suivi du dossier',
    desc: 'Suivez chaque étape du traitement de votre dossier avec une visibilité claire.',
    img: 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80'
  }
]

const chiffres = [
  { value: '24/7', label: 'Assistance routière' },
  { value: '48h', label: 'Prise en charge initiale' },
  { value: '160', label: 'Agences partenaires' },
  { value: '95%', label: 'Clients satisfaits' }
]

const etapes = [
  {
    step: '01',
    title: 'Déclarer en ligne',
    desc: 'Remplissez le formulaire sinistre auto et ajoutez les photos de l accident.'
  },
  {
    step: '02',
    title: 'Analyse du dossier',
    desc: 'Le dossier est analysé automatiquement puis orienté vers validation si besoin.'
  },
  {
    step: '03',
    title: 'Décision & indemnisation',
    desc: 'Vous suivez la décision et le montant directement depuis votre espace client.'
  }
]

export default function MaVoiturePage() {
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
          c.typeContrat?.toLowerCase() === 'auto' ||
          c.typeContrat?.toLowerCase() === 'voiture'
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
        title="Vous devez posséder un contrat automobile pour déclarer un sinistre."
        disabled
      >
        Déclarer un sinistre
      </button>
    )
    return (
      <Link to="/declaration-sinistre?type=AUTO" className={className}>
        Déclarer un sinistre
      </Link>
    )
  }

  return (
    <main>
      <section className="section container products-section">
        <p className="section-kicker">Ma voiture</p>
        <h1 className="section-title">Assurance auto simple, rapide et complète</h1>
        <div className="news-block">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80"
            alt="Assurance automobile"
          />
          <div>
            <p className="news-tag">Protection automobile</p>
            <h4>Roulez en toute tranquillité avec AssurGo</h4>
            <p>
              Choisissez une formule adaptée à votre profil et profitez d’un accompagnement humain à chaque étape.
            </p>
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
        <p className="section-kicker">Services auto</p>
        <h2 className="section-title">Des services pensés pour votre mobilité</h2>
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
        <h2 className="section-title">Comment traiter votre dossier auto</h2>
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
            <h2 className="section-title left">Déclarer un sinistre automobile</h2>
            <p className="text-muted">
              Déclarez votre sinistre en ligne puis suivez chaque étape du traitement en temps réel.
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
