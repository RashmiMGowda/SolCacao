import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { formatPrice, getProductCopy } from '../data/products'
import { useCart } from '../hooks/useCart'

export function CartLineItem({ item, compact = false, onNavigate }) {
  const { locale, t } = useLocalization()
  const { removeItem, setQuantity } = useCart()
  const { product, quantity } = item
  const copy = getProductCopy(product, locale)
  const productPath = product.kind === 'sampler' ? '/sampler' : `/shop/${product.id}`
  const productMeta = product.cartMeta?.[locale] || [
    product.weight,
    product.cacao ? `${product.cacao}%` : null,
  ].filter(Boolean).join(' · ')

  return (
    <article className={`cart-line-item ${compact ? 'is-compact' : ''}`}>
      <Link aria-hidden="true" className="cart-line-image" tabIndex={-1} to={productPath} onClick={onNavigate}>
        <img src={product.image} alt="" />
      </Link>
      <div className="cart-line-copy">
        <Link to={productPath} onClick={onNavigate}>{copy.name}</Link>
        <span>{productMeta}</span>
        <button type="button" onClick={() => removeItem(product.id)}>
          <Trash2 size={15} aria-hidden="true" />
          {t('catalog.remove')}
        </button>
      </div>
      <div className="cart-quantity" aria-label={t('catalog.quantity')}>
        <button
          aria-label={t('catalog.decreaseQuantity')}
          disabled={quantity <= 1}
          type="button"
          onClick={() => setQuantity(product.id, quantity - 1)}
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <span>{quantity}</span>
        <button
          aria-label={t('catalog.increaseQuantity')}
          disabled={quantity >= product.stock}
          type="button"
          onClick={() => setQuantity(product.id, quantity + 1)}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
      <strong className="cart-line-total">
        {formatPrice(product.price * quantity, locale)}
      </strong>
    </article>
  )
}
