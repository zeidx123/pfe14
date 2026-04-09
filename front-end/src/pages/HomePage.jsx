import { Link } from 'react-router-dom'

const products = [
  {
    title: 'Mon habitation',
    desc: 'Protection du logement, incendie, vol et dégâts des eaux.',
    icon: '🏠'
  },
  {
    title: 'Mon voyage',
    desc: 'Assistance avant et pendant le voyage en Tunisie et à l’étranger.',
    icon: '✈️'
  },
  {
    title: 'Ma prévoyance',
    desc: 'Solutions pour protéger votre famille et préparer l’avenir.',
    icon: '💚'
  },
  {
    title: 'Ma voiture',
    desc: 'Formules auto adaptées, assistance et prise en charge rapide.',
    icon: '🚗'
  }
]

const demarches = [
  {
    title: 'Sinistre automobile',
    desc: 'Déclarez votre accident en ligne et suivez votre dossier étape par étape.',
    img: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1000&q=80'
  },
  {
    title: 'Sinistre habitation',
    desc: 'En cas de vol ou dommage, envoyez vos justificatifs de manière sécurisée.',
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'
  },
  {
    title: 'Constat amiable',
    desc: 'Téléchargez le formulaire et recevez l’accompagnement nécessaire.',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1000&q=80'
  }
]

const chiffres = [
  { value: '65', label: 'Années d’expérience' },
  { value: '160', label: 'Agences' },
  { value: '500+', label: 'Collaborateurs' },
  { value: '24/7', label: 'Service assistance' }
]

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-image" role="img" aria-label="Bannière assurance" />
        <div className="container hero-content">
          <article className="hero-card-main">
            <h1>AssurGo Assurances</h1>
            <h2>Expertise multidisciplinaire pour vos assurances</h2>
            <p>
              Une assurance adaptée à chaque détail pour protéger votre famille, votre logement et votre mobilité.
            </p>
            <button className="primary">Découvrir</button>
          </article>
        </div>
      </section>

      <section className="section container products-section">
        <p className="section-kicker">Nos produits</p>
        <h3 className="section-title">Préparer sereinement votre avenir</h3>
        <div className="product-grid">
          {products.map((item) => (
            <article className="product-card" key={item.title}>
              <span className="product-icon">{item.icon}</span>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-news">
        <div className="container">
          <p className="section-kicker">Découvrez les nouveautés</p>
          <h3 className="section-title big">Explorez les tendances et solutions assurances</h3>

          <div className="news-block">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80"
              alt="Nouvelle offre assurance"
            />
            <div>
              <p className="news-tag">Actualité</p>
              <h4>Un service d’assistance humaine disponible 24/7 partout en Tunisie</h4>
              <p>
                Notre équipe vous accompagne en agence et à distance pour simplifier la déclaration et le suivi
                de votre dossier.
              </p>
              <Link to="/">Découvrir l’actualité</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <p className="section-kicker">Démarches</p>
        <h3 className="section-title">AssurGo est à votre écoute pour satisfaire vos besoins</h3>
        <div className="demarche-grid">
          {demarches.map((item) => (
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

      <section className="section section-alt stats-section">
        <div className="container stats-layout">
          <div>
            <p className="section-kicker">AssurGo en chiffres</p>
            <h3 className="section-title left">Pourquoi choisir AssurGo Assurances ?</h3>
            <p className="text-muted">
              Depuis sa création, AssurGo accompagne ses clients avec proximité, transparence et solutions
              innovantes pour répondre à l’évolution de leurs besoins.
            </p>
            <button className="primary">Lire la suite</button>
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

      <section className="footer-top">
        <div className="container footer-top-grid">
          <div>
            <h4>Équipe professionnelle</h4>
          </div>
          <div>
            <h4>Solutions innovantes</h4>
          </div>
          <div>
            <h4>24/7 Assistance</h4>
          </div>
        </div>
      </section>
    </main>
  )
}
