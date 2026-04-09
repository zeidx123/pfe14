import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const garanties = [
  {
    icon: '👨‍👩‍👧',
    title: 'Protection famille',
    desc: 'Préservez l’équilibre de vos proches en cas d’imprévu majeur.'
  },
  {
    icon: '💼',
    title: 'Capital avenir',
    desc: 'Constituez un capital pour financer les projets importants de votre famille.'
  },
  {
    icon: '❤️',
    title: 'Sérénité long terme',
    desc: 'Des solutions de prévoyance pour préparer l’avenir avec confiance.'
  }
]

const services = [
  {
    title: 'Bilan prévoyance',
    desc: 'Analysez vos besoins et choisissez la formule la plus adaptée.',
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Accompagnement expert',
    desc: 'Nos conseillers vous accompagnent pour construire une couverture sur mesure.',
    img: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Suivi personnalisé',
    desc: 'Adaptez votre contrat selon l’évolution de votre situation personnelle.',
    img: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80'
  }
]

const chiffres = [
  { value: '65', label: 'Années d’expertise' },
  { value: '500+', label: 'Conseillers dédiés' },
  { value: '24/7', label: 'Support client' },
  { value: '94%', label: 'Clients fidèles' }
]

const etapes = [
  {
    step: '01',
    title: 'Déclarer la situation',
    desc: 'Renseignez votre contrat et la situation concernée dans le formulaire sinistre.'
  },
  {
    step: '02',
    title: 'Ajouter les justificatifs',
    desc: 'Chargez les documents nécessaires pour une analyse rapide de votre dossier.'
  },
  {
    step: '03',
    title: 'Recevoir la décision',
    desc: 'Suivez la décision et les prochaines étapes de prise en charge.'
  }
]

export default function MaPrevoyancePage() {
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
          c.typeContrat?.toLowerCase() === 'prevoyance'
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
        title="Vous devez posséder un contrat prévoyance pour déclarer un sinistre."
        disabled
      >
        Déclarer un sinistre
      </button>
    )
    return (
      <Link to="/declaration-sinistre?type=PREVOYANCE" className={className}>
        Déclarer un sinistre
      </Link>
    )
  }

  return (
    <main>
      <section className="section container products-section">
        <p className="section-kicker">Ma prévoyance</p>
        <h1 className="section-title">Préparez l’avenir de votre famille</h1>
        <div className="news-block">
          <img
            src="https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=1400&q=80"
            alt="Prévoyance famille"
          />
          <div>
            <p className="news-tag">Protection long terme</p>
            <h4>Des solutions de prévoyance adaptées à chaque étape de vie</h4>
            <p>Bénéficiez d’une couverture flexible pour protéger vos proches et vos projets.</p>
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
        <p className="section-kicker">Services prévoyance</p>
        <h2 className="section-title">Un accompagnement durable et personnalisé</h2>
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
        <h2 className="section-title">Comment traiter votre dossier prévoyance</h2>
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
            <h2 className="section-title left">Construire ma protection future</h2>
            <p className="text-muted">
              Suivez vos contrats et mettez à jour vos garanties selon vos objectifs de vie.
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
