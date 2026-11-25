import { ShoppingBag, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { formatPrice } from '../data/products'
import { useCart } from '../hooks/useCart'
import { CartLineItem } from './CartLineItem'

export function CartDrawer() {
  const { locale, t } = useLocalization()
  const {
    closeCart,
    detailedItems,
    isDrawerOpen,
    itemCount,
    subtotal,
  } = useCart()
  const closeButtonRef = useRef(null)
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!isDrawerOpen) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeCart()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = drawerRef.current?.querySelectorAll(
        'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [closeCart, isDrawerOpen])

  if (!isDrawerOpen) return null

  const tax = subtotal * 0.08

  return (
    <div className="cart-drawer-layer">
      <button
        aria-label={t('catalog.closeCart')}
        className="cart-drawer-overlay"
        type="button"
        onClick={closeCart}
      />
      <div
        ref={drawerRef}
        aria-labelledby="cart-drawer-title"
        aria-modal="true"
        className="cart-drawer"
        role="dialog"
      >
        <div className="cart-drawer-header">
          <div>
            <p>{t('catalog.yourSelection')}</p>
            <h2 id="cart-drawer-title">{t('catalog.yourCart')}</h2>
          </div>
          <button
            ref={closeButtonRef}
            aria-label={t('catalog.closeCart')}
            className="cart-drawer-close"
            type="button"
            onClick={closeCart}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {detailedItems.length ? (
          <>
            <div className="cart-drawer-items">
              {detailedItems.map((item) => (
                <CartLineItem compact item={item} key={item.productId} onNavigate={closeCart} />
              ))}
            </div>
            <div className="cart-summary">
              <div><span>{t('catalog.items')}</span><strong>{itemCount}</strong></div>
              <div><span>{t('catalog.subtotal')}</span><strong>{formatPrice(subtotal, locale)}</strong></div>
              <div><span>{t('catalog.estimatedTax')}</span><strong>{formatPrice(tax, locale)}</strong></div>
              <div className="cart-summary-total"><span>{t('catalog.total')}</span><strong>{formatPrice(subtotal + tax, locale)}</strong></div>
              <Link className="btn btn-primary" to="/cart" onClick={closeCart}>
                {t('catalog.viewCart')}
              </Link>
              <button className="cart-continue" type="button" onClick={closeCart}>
                {t('catalog.continueShopping')}
              </button>
            </div>
          </>
        ) : (
          <div className="cart-empty-state">
            <ShoppingBag size={42} aria-hidden="true" />
            <h3>{t('catalog.emptyCart')}</h3>
            <p>{t('catalog.emptyCartBody')}</p>
            <Link className="btn btn-primary" to="/shop" onClick={closeCart}>
              {t('catalog.browseChocolate')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
