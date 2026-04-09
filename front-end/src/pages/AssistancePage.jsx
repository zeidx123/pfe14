import { Link } from 'react-router-dom'

const assistanceContacts = [
  {
    icon: '📞',
    title: 'Assistance Automobile',
    number: '70 255 001',
    desc: 'Disponible 24h/24 et 7j/7 pour tout dépannage ou remorquage en Tunisie.'
  },
  {
    icon: '🏠',
    title: 'Assistance Habitation',
    number: '70 255 002',
    desc: 'Urgence serrurerie, plomberie ou électricité à votre domicile.'
  },
  {
    icon: '✈️',
    title: 'Assistance Voyage',
    number: '+216 70 255 003',
    desc: 'Support médical et rapatriement lors de vos déplacements à l\'étranger.'
  }
]

export default function AssistancePage() {
  return (
    <main>
      <section className="section container products-section">
        <p className="section-kicker">Assistance</p>
        <h1 className="section-title">Nous sommes là pour vous, 24h/24 et 7j/7</h1>
        <div className="news-block">
          <img
            src="https://images.unsplash.com/photo-1582213708522-f8941da9287c?auto=format&fit=crop&w=1400&q=80"
            alt="Service d'assistance"
          />
          <div>
            <p className="news-tag">Urgence & Support</p>
            <h4>Une aide immédiate en un seul clic</h4>
            <p>
              Parce qu'un imprévu n'attend pas, nos équipes d'assistance sont mobilisées en permanence pour garantir votre sécurité et votre sérénité.
            </p>
            <a href="tel:70255000" className="nav-btn primary-btn devis-btn">
              Appeler le service client
            </a>
          </div>
        </div>
      </section>

      <section className="section container">
        <p className="section-kicker">Nos numéros utiles</p>
        <div className="product-grid">
          {assistanceContacts.map((item) => (
            <article className="product-card" key={item.title}>
              <span className="product-icon">{item.icon}</span>
              <h4>{item.title}</h4>
              <p className="history-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>{item.number}</p>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container stats-layout">
          <div>
            <h2 className="section-title left">Comment se passe l'intervention ?</h2>
            <p className="text-muted">
              Dès votre appel, nous géolocalisons le prestataire le plus proche de votre position pour une intervention moyenne en moins de 45 minutes.
            </p>
            <Link to="/se-connecter" className="nav-btn primary-btn">
              Suivre mon intervention
            </Link>
          </div>
          <div className="stats-grid-2">
            <article className="stat-box">
              <h4>45 min</h4>
              <p>Temps d'attente moyen</p>
            </article>
            <article className="stat-box">
              <h4>24/7</h4>
              <p>Disponibilité totale</p>
            </article>
            <article className="stat-box">
              <h4>+500</h4>
              <p>Dépanneurs agréés</p>
            </article>
            <article className="stat-box">
              <h4>100%</h4>
              <p>Soutien immédiat</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}
