import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { CartLineItem } from '../components/CartLineItem'
import { formatPrice } from '../data/products'
import { useCart } from '../hooks/useCart'
import '../catalog.css'

export function CartPage() {
  const { locale, t } = useLocalization()
  const { clearCart, detailedItems, itemCount, subtotal } = useCart()
  const tax = subtotal * 0.08

  if (!detailedItems.length) {
    return (
      <main className="cart-page cart-page-empty">
        <ShoppingBag size={52} aria-hidden="true" />
        <h1>{t('catalog.emptyCart')}</h1>
        <p>{t('catalog.emptyCartBody')}</p>
        <Link className="btn btn-primary" to="/shop">{t('catalog.browseChocolate')}</Link>
      </main>
    )
  }

  return (
    <main className="cart-page">
      <header className="cart-page-heading">
        <div><p className="eyebrow">{t('catalog.yourSelection')}</p><h1>{t('catalog.yourCart')}</h1><p>{t('catalog.cartIntro')}</p></div>
        <button type="button" onClick={clearCart}>{t('catalog.clearCart')}</button>
      </header>
      <div className="cart-page-layout">
        <section className="cart-page-items">
          {detailedItems.map((item) => <CartLineItem item={item} key={item.productId} />)}
        </section>
        <aside className="cart-page-summary">
          <h2>{t('catalog.orderSummary')}</h2>
          <div><span>{t('catalog.items')}</span><strong>{itemCount}</strong></div>
          <div><span>{t('catalog.subtotal')}</span><strong>{formatPrice(subtotal, locale)}</strong></div>
          <div><span>{t('catalog.estimatedTax')}</span><strong>{formatPrice(tax, locale)}</strong></div>
          <div className="cart-summary-total"><span>{t('catalog.total')}</span><strong>{formatPrice(subtotal + tax, locale)}</strong></div>
          <Link className="btn btn-primary" to="/checkout">{t('catalog.checkout')}</Link>
          <Link to="/shop">{t('catalog.continueShopping')}</Link>
        </aside>
      </div>
    </main>
  )
}
