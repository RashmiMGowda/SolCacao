import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { useToast } from '../../../shared/toast/useToast'
import { useProducts } from '../hooks/useProducts'
import { formatPrice, getProductCopy } from '../data/products'
import { useCart } from '../hooks/useCart'
import '../catalog.css'

export function ProductDetailPage() {
  const { productId } = useParams()
  const [quantity, setQuantity] = useState(1)
  const { locale, t } = useLocalization()
  const { addItem, detailedItems, openCart } = useCart()
  const { showToast } = useToast()

  const { products, loading, error } = useProducts(locale)
  const product = products.find(item => item.id === productId || item.slug === productId)
  if (loading) return <p role="status">{locale === 'es' ? 'Cargando producto…' : 'Loading product…'}</p>
  if (error) return <p role="alert">{locale === 'es' ? 'No se pudo cargar el producto.' : 'Could not load the product.'}</p>
  if (!product) return <Navigate replace to="/shop" />

  const copy = getProductCopy(product, locale)
  const cartQuantity = detailedItems.find((item) => item.productId === product.id)?.quantity || 0
  const availableToAdd = Math.max(0, product.stock - cartQuantity)
  const isOutOfStock = product.stock === 0

  function handleAdd() {
    if (!availableToAdd) {
      showToast({ message: t('catalog.stockLimit'), type: 'error' })
      return
    }

    addItem(product.id, Math.min(quantity, availableToAdd), product)
    showToast({ message: t('catalog.addedToCart') })
  }

  return (
    <main className="product-detail-page">
      <Link className="product-back-link" to="/shop"><ArrowLeft size={18} aria-hidden="true" />{t('catalog.backToCatalog')}</Link>
      <div className="product-detail-layout">
        <div className="product-detail-media">
          {product.tag ? <span>{t(`catalog.tags.${product.tag}`)}</span> : null}
          <img src={product.image} alt={copy.name} />
        </div>
        <section className="product-detail-copy">
          <p className="eyebrow">{product.origin} · {copy.region}</p>
          <h1>{copy.name}</h1>
          <p className="product-detail-features">{copy.features.join(' · ')}</p>
          <strong className="product-detail-price">{formatPrice(product.price, locale)}</strong>
          <p className="product-detail-description">{copy.description}</p>

          <dl className="product-detail-meta">
            <div><dt>{t('catalog.cacao')}</dt><dd>{product.cacao}%</dd></div>
            <div><dt>{t('catalog.format')}</dt><dd>{product.weight}</dd></div>
            <div><dt>{t('catalog.origin')}</dt><dd>{product.origin}</dd></div>
          </dl>

          <p className={`product-detail-stock ${isOutOfStock ? 'is-out' : product.stock <= 3 ? 'is-low' : ''}`}>
            {isOutOfStock ? t('catalog.outOfStock') : product.stock <= 3 ? t('catalog.onlyLeft').replace('{count}', product.stock) : t('catalog.inStock')}
          </p>

          <div className="product-detail-buy-row">
            <div className="cart-quantity product-detail-quantity" aria-label={t('catalog.quantity')}>
              <button aria-label={t('catalog.decreaseQuantity')} disabled={quantity <= 1 || isOutOfStock} type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={17} /></button>
              <span>{quantity}</span>
              <button aria-label={t('catalog.increaseQuantity')} disabled={quantity >= product.stock || isOutOfStock} type="button" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}><Plus size={17} /></button>
            </div>
            <button className="btn btn-primary" disabled={isOutOfStock || !availableToAdd} type="button" onClick={handleAdd}><ShoppingBag size={18} aria-hidden="true" />{t('catalog.addToCart')}</button>
          </div>

          {cartQuantity ? (
            <button className="product-view-cart" type="button" onClick={openCart}>
              {t('catalog.alreadyInCart').replace('{count}', cartQuantity)}
            </button>
          ) : null}
        </section>
      </div>
    </main>
  )
}
