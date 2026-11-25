import { useUiText } from '../../localization/hooks/useUiText'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../../catalog/hooks/useProducts'
import { formatPrice, getProductCopy } from '../../catalog/data/products'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { useAuth } from '../hooks/useAuth'
import { canSeeBusinessLinks } from '../services/roleAccess'

const heroImg =
  'https://mir-s3-cdn-cf.behance.net/project_modules/hd_webp/2fb9e3249375285.6a06008911d47.png'

const packagingImg =
  'https://img.shoplineapp.com/media/image_clips/691d7ff7c46aaf00102334d1/original.jpg?1763540983=&owner_id=5ca6dda99972ff000189e573'

export function HomePage() {
  const ui = useUiText()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { locale, t } = useLocalization()
  const { user } = useAuth()
  const showBusiness = canSeeBusinessLinks(user)
  const { products } = useProducts(locale)
  const featuredProducts = products.slice(0, 4)

  function handleImageError(event) {
    event.currentTarget.onerror = null
    event.currentTarget.src = packagingImg
  }

  function handleSearch(event) {
    event.preventDefault()
    const normalizedQuery = query.trim()
    navigate(normalizedQuery ? `/shop?q=${encodeURIComponent(normalizedQuery)}` : '/shop')
  }

  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{ui("Single-Origin Collection")}</p>
          <h1>{ui("Chocolate with a story in every square.")}</h1>
          <p className="lead">
            {ui("Single-origin bars, thoughtful gifts, and artisan cacao to savor and share.")}
          </p>
          <form className="home-search" role="search" onSubmit={handleSearch}>
            <span aria-hidden="true">⌕</span>
            <input
              aria-label={t('catalog.searchLabel')}
              placeholder={t('catalog.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn btn-primary btn-small" type="submit">
              {t('catalog.search')}
            </button>
          </form>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/shop">
              {ui("Browse Chocolates")}
            </Link>
            <Link className="btn btn-soft" to="/sampler">
              {ui("Build a Sampler")}
            </Link>
          </div>
        </div>
        <div className="hero-media">
          <img src={heroImg} alt={ui("Premium SolCacao chocolate")} onError={handleImageError} />
          <span>{ui("Single-Origin Collection")}</span>
        </div>
      </section>

      <section className="collection-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">{ui("Featured Collection")}</p>
            <h2>{ui("Discover by origin")}</h2>
          </div>
          <Link to="/shop">{ui("View full catalog →")}</Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                {product.tag ? <span>{t(`catalog.tags.${product.tag}`)}</span> : null}
                <Link to={`/shop/${product.id}`}>
                  <img
                    src={product.image}
                    alt={getProductCopy(product, locale).name}
                    onError={handleImageError}
                  />
                </Link>
              </div>
              <div className="product-body">
                <h3>
                  <Link to={`/shop/${product.id}`}>{getProductCopy(product, locale).name}</Link>
                </h3>
                <p>{getProductCopy(product, locale).region}</p>
                <small className={product.stock === 0 ? 'stock-out' : ''}>
                  {product.stock === 0
                    ? t('catalog.outOfStock')
                    : product.stock <= 3
                      ? t('catalog.onlyLeft').replace('{count}', product.stock)
                      : t('catalog.inStock')}
                </small>
                <strong>{formatPrice(product.price, locale)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="packaging-band">
        <img
          src={packagingImg}
          alt={ui("Premium chocolate gift box and cocoa beans")}
          onError={handleImageError}
        />
        <div>
          <p className="eyebrow">{ui("Designed to be gifted")}</p>
          <h2>{ui("Packaging that feels as considered as the chocolate.")}</h2>
          <p>
            {ui("Premium boxes, elegant presentation, and branded sleeves create a high-end unboxing experience for retail gifts and corporate programs.")}
          </p>
          {showBusiness ? <Link className="btn btn-outline btn-small" to="/business">
            {ui("Explore Packaging Options")}
          </Link> : <Link className="btn btn-outline btn-small" to="/shop">{ui("Browse Gift Boxes")}</Link>}
        </div>
      </section>

      {showBusiness && <section className="business-band">
        <div>
          <p className="eyebrow">{ui("Corporate & Wholesale")}</p>
          <h2>{ui("Create chocolate made for your brand.")}</h2>
          <p>
            {ui("Custom molds, white-label packaging, gifting programs, and high-volume manufacturing quotes for hotels, events, and wholesale customers.")}
          </p>
          <Link className="btn btn-soft btn-small" to="/business">
            {ui("View B2B Services")}
          </Link>
        </div>
        <div className="business-tags" aria-label={ui("Business services")}>
          <span>{ui("✓ Custom cacao profiles")}</span>
          <span>{ui("✓ Branded molds")}</span>
          <span>{ui("✓ Luxury packaging")}</span>
          <span>{ui("✓ White-label options")}</span>
        </div>
      </section>}
    </main>
  )
}
