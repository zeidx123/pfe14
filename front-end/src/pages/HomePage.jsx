import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation()

  const products = [
    { title: t('home.products.items.habitation.title'), desc: t('home.products.items.habitation.desc'), icon: '🏠' },
    { title: t('home.products.items.voyage.title'), desc: t('home.products.items.voyage.desc'), icon: '✈️' },
    { title: t('home.products.items.prevoyance.title'), desc: t('home.products.items.prevoyance.desc'), icon: '💚' },
    { title: t('home.products.items.voiture.title'), desc: t('home.products.items.voiture.desc'), icon: '🚗' }
  ]

  const demarches = [
    {
      title: t('home.demarches.items.auto.title'),
      desc: t('home.demarches.items.auto.desc'),
      img: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1000&q=80'
    },
    {
      title: t('home.demarches.items.hab.title'),
      desc: t('home.demarches.items.hab.desc'),
      img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'
    },
    {
      title: t('home.demarches.items.constat.title'),
      desc: t('home.demarches.items.constat.desc'),
      img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1000&q=80'
    }
  ]

  const chiffres = [
    { value: '65', label: t('home.stats.items.exp') },
    { value: '160', label: t('home.stats.items.agences') },
    { value: '500+', label: t('home.stats.items.collab') },
    { value: '24/7', label: t('home.stats.items.assist') }
  ]

  return (
    <main>
      <section className="hero">
        <div className="hero-image" role="img" aria-label="Bannière assurance" />
        <div className="container hero-content">
          <article className="hero-card-main">
            <h1>{t('home.hero.title')}</h1>
            <h2>{t('home.hero.subtitle')}</h2>
            <p>{t('home.hero.desc')}</p>
            <button className="primary">{t('common.discover')}</button>
          </article>
        </div>
      </section>

      <section className="section container products-section">
        <p className="section-kicker">{t('home.products.kicker')}</p>
        <h3 className="section-title">{t('home.products.title')}</h3>
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
          <p className="section-kicker">{t('home.news.kicker')}</p>
          <h3 className="section-title big">{t('home.news.title')}</h3>

          <div className="news-block">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80"
              alt="Nouvelle offre assurance"
            />
            <div>
              <p className="news-tag">{t('home.news.tag')}</p>
              <h4>{t('home.news.cardTitle')}</h4>
              <p>{t('home.news.cardDesc')}</p>
              <Link to="/">{t('home.news.link')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <p className="section-kicker">{t('home.demarches.kicker')}</p>
        <h3 className="section-title">{t('home.demarches.title')}</h3>
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
            <p className="section-kicker">{t('home.stats.kicker')}</p>
            <h3 className="section-title left">{t('home.stats.title')}</h3>
            <p className="text-muted">{t('home.stats.desc')}</p>
            <button className="primary">{t('common.readMore')}</button>
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
            <h4>{t('home.footerTop.pro')}</h4>
          </div>
          <div>
            <h4>{t('home.footerTop.innov')}</h4>
          </div>
          <div>
            <h4>{t('home.footerTop.assist')}</h4>
          </div>
        </div>
      </section>
    </main>
  )
}
