import { useLocalization } from '../../localization/hooks/useLocalization'
import { Link } from 'react-router-dom'
import B2BHeader from '../components/B2BHeader'
import '../b2b.css'
import fallbackImage from '../../../assets/hero.png'
import { useAuth } from '../../auth/hooks/useAuth'
import { canSeeBusinessLinks } from '../../auth/services/roleAccess'
const heroImage = 'https://img.shoplineapp.com/media/image_clips/691d7ff7c46aaf00102334d1/original.jpg?1763540983=&owner_id=5ca6dda99972ff000189e573'
const images = ['https://mir-s3-cdn-cf.behance.net/project_modules/hd_webp/2fb9e3249375285.6a06008911d47.png', heroImage, 'https://images.unsplash.com/photo-1575377427642-087cf684f29d?auto=format&fit=crop&w=900&q=85']
const recoverImage = event => { event.currentTarget.src = fallbackImage }

export default function B2BPage() {
  const { locale: language, t } = useLocalization()
  const { user } = useAuth()
  const showBusiness = canSeeBusinessLinks(user)
  const requestPath = user?.role === 'ADMIN' ? '/business/manage' : '/business/quote'
  const requestLabel = user?.role === 'ADMIN' ? t('b2b.manageRequests') : null
  const text = t('b2b.services')
  return <main className="b2b-page" lang={language}><div className="b2b-wrap">
    <B2BHeader />
    <section className="b2b-hero"><div className="b2b-hero-card"><p className="b2b-eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="b2b-lead">{text.description}</p><div className="b2b-actions">{showBusiness && <Link className="b2b-button primary" to={requestPath} state={{ language }}>{requestLabel || text.start}</Link>}<Link className="b2b-button" to="/contact">{text.talk}</Link></div><p className="b2b-audience">{text.audience}</p></div><div className="b2b-hero-media"><img src={heroImage} onError={recoverImage} alt={t('b2b.extra.heroAlt')} /></div></section>
    <section className="b2b-solutions"><p className="b2b-eyebrow">{text.solutions}</p><h2>{text.solutionsTitle}</h2><div className="b2b-services">{text.titles.map((title, index) => <article className="b2b-service" key={title}>{index < 3 ? <div className="b2b-service-media"><img src={images[index]} onError={recoverImage} alt={title} loading="lazy" /></div> : <div className="b2b-service-icon" aria-hidden="true">🏨</div>}<h3>{title}</h3><p>{text.descriptions[index]}</p></article>)}</div></section>
    {showBusiness && <section className="b2b-cta"><div><h3>{text.cta}</h3><p>{text.gate}</p></div><Link className="b2b-button primary" to={requestPath} state={{ language }}>{requestLabel || text.request}</Link></section>}
  </div></main>
}
