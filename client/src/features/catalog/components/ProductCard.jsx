import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { useToast } from '../../../shared/toast/useToast'
import { formatPrice, getProductCopy } from '../data/products'
import { useCart } from '../hooks/useCart'

export function ProductCard({ product }) {
  const { locale, t } = useLocalization()
  const { addItem, detailedItems } = useCart()
  const { showToast } = useToast()
  const copy = getProductCopy(product, locale)
  const isOutOfStock = product.stock === 0

  function handleAddToCart() {
    const cartQuantity =
      detailedItems.find((item) => item.productId === product.id)?.quantity || 0

    if (cartQuantity >= product.stock) {
      showToast({ message: t('catalog.stockLimit'), type: 'error' })
      return
    }

    addItem(product.id, 1, product)
    showToast({ message: t('catalog.addedToCart') })
  }

  return (
    <article className="catalog-product-card">
      <Link
        className="catalog-product-link"
        to={`/shop/${product.id}`}
      >
        <div className="catalog-product-image">
          {product.tag ? (
            <span className="catalog-product-tag">{t(`catalog.tags.${product.tag}`)}</span>
          ) : null}
          <img src={product.image} alt={copy.name} />
        </div>
        <div className="catalog-product-copy">
          <p>{copy.region}</p>
          <h2>{copy.name}</h2>
          <span
            className={`catalog-stock ${
              isOutOfStock ? 'is-out' : product.stock <= 3 ? 'is-low' : ''
            }`}
          >
            {isOutOfStock
              ? t('catalog.outOfStock')
              : product.stock <= 3
                ? t('catalog.onlyLeft').replace('{count}', product.stock)
                : t('catalog.inStock')}
          </span>
          <strong>{formatPrice(product.price, locale)}</strong>
        </div>
      </Link>
      <button
        className="catalog-add-button"
        disabled={isOutOfStock}
        type="button"
        onClick={handleAddToCart}
      >
        <ShoppingBag size={17} aria-hidden="true" />
        {isOutOfStock ? t('catalog.unavailable') : t('catalog.quickAdd')}
      </button>
    </article>
  )
}
