import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function AgencesPage() {
    const [agences, setAgences] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch('/api/agences')
            .then((res) => res.json())
            .then((data) => setAgences(Array.isArray(data) ? data : []))
            .catch(() => setAgences([]))
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <main>
            <section className="section container products-section">
                <p className="section-kicker">Nos Agences</p>
                <h1 className="section-title">Trouvez l'agence AssurGo la plus proche</h1>
                <div className="news-block">
                    <img
                        src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
                        alt="Nos agences"
                    />
                    <div>
                        <p className="news-tag">Proximité & Conseil</p>
                        <h4>Plus de {agences.length > 0 ? agences.length : 160} agences à travers la Tunisie</h4>
                        <p>
                            Nos conseillers vous accueillent partout en Tunisie pour vous proposer des solutions personnalisées et un accompagnement de proximité.
                        </p>
                        <button className="nav-btn primary-btn devis-btn">
                            Afficher sur la carte
                        </button>
                    </div>
                </div>
            </section>

            <section className="section container">
                <p className="section-kicker">Réseau d'agences</p>
                {isLoading ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>Chargement...</p>
                ) : agences.length === 0 ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>Aucune agence disponible.</p>
                ) : (
                    <div className="product-grid">
                        {agences.map((item) => (
                            <article className="product-card" key={item.id} style={{ textAlign: 'left' }}>
                                {item.nomAgence && (
                                    <h4 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{item.nomAgence}</h4>
                                )}
                                <p style={{ fontWeight: '600', color: '#00cccc', marginBottom: '0.6rem' }}>
                                    🏙️ {item.ville || '-'}
                                </p>
                                {item.adresse && <p>📍 {item.adresse}</p>}
                                {item.telephone && <p>📞 {item.telephone}</p>}
                                {item.horaires && <p>🕒 {item.horaires}</p>}
                                <Link to="/contact" style={{ color: '#00cccc', fontWeight: 'bold', display: 'block', marginTop: '1rem' }}>
                                    Prendre rendez-vous →
                                </Link>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="section section-alt">
                <div className="container stats-layout">
                    <div>
                        <h2 className="section-title left">Vous souhaitez devenir partenaire ?</h2>
                        <p className="text-muted">
                            Rejoignez le réseau AssurGo et bénéficiez de notre expertise et de nos outils digitaux pour développer votre activité.
                        </p>
                        <Link to="/contact" className="nav-btn primary-btn">
                            En savoir plus
                        </Link>
                    </div>
                    <div className="stats-grid-2">
                        <article className="stat-box">
                            <h4>160+</h4>
                            <p>Points de vente</p>
                        </article>
                        <article className="stat-box">
                            <h4>24/24</h4>
                            <p>Support partenaire</p>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    )
}
