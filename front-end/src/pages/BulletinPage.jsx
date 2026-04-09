import { useEffect, useState } from 'react'

const formatDate = (value) => {
    if (!value) return '-'
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
}

export default function BulletinPage() {
    const [publications, setPublications] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch('/api/publications')
            .then((res) => res.json())
            .then((data) => setPublications(Array.isArray(data) ? data : []))
            .catch(() => setPublications([]))
            .finally(() => setIsLoading(false))
    }, [])

    const aLaUne = publications.find((p) => p.aLaUne) || publications[0] || null
    const autres = publications.filter((p) => p !== aLaUne)

    return (
        <main>
            <section className="section container products-section">
                <p className="section-kicker">Bulletin</p>
                <h1 className="section-title">Actualités et conseils d'experts</h1>
                {isLoading ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>Chargement...</p>
                ) : aLaUne ? (
                    <div className="news-block">
                        {aLaUne.imageUrl && (
                            <img src={aLaUne.imageUrl} alt={aLaUne.titre} />
                        )}
                        <div>
                            <p className="news-tag">À la une</p>
                            <h4>{aLaUne.titre}</h4>
                            <p>{aLaUne.description}</p>
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="section container">
                <p className="section-kicker">Dernières publications</p>
                {isLoading ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>Chargement...</p>
                ) : autres.length === 0 && !aLaUne ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>Aucune publication disponible.</p>
                ) : (
                    <div className="demarche-grid">
                        {autres.map((item) => (
                            <article className="demarche-card" key={item.id}>
                                {item.imageUrl && <img src={item.imageUrl} alt={item.titre} />}
                                <div className="demarche-body">
                                    <p className="news-tag" style={{ fontSize: '0.9rem' }}>{item.categorie} • {formatDate(item.datePublication)}</p>
                                    <h4 style={{ fontSize: '1.4rem', margin: '0.5rem 0' }}>{item.titre}</h4>
                                    <p>{item.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="section section-alt">
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 className="section-title">Abonnez-vous à notre newsletter</h2>
                    <p className="text-muted" style={{ maxWidth: '600px', marginInline: 'auto' }}>
                        Recevez chaque mois nos meilleurs conseils et nos actualités en avant-première directment dans votre boîte mail.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '2rem' }}>
                        <input
                            type="email"
                            placeholder="votre@email.com"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                height: '50px',
                                borderRadius: '12px',
                                border: '1px solid #d6deea',
                                padding: '0 1rem',
                                outline: 'none'
                            }}
                        />
                        <button className="nav-btn primary-btn">S'abonner</button>
                    </div>
                </div>
            </section>
        </main>
    )
}
