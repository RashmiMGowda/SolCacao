import { CheckCircle2, Mail, MapPin } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { formatPrice } from '../data/products'
import { getDemoOrder } from '../services/checkoutService'
import { useAuth } from '../../auth/hooks/useAuth'
import { getApiOrder } from '../services/orderService'
import '../catalog.css'

export function OrderConfirmationPage() {
  const { orderId } = useParams()
  const { locale, t } = useLocalization()
  const { user, isBootstrapping, authMode } = useAuth()
  const [apiOrder, setApiOrder] = useState(null)
  const [apiDone, setApiDone] = useState(authMode !== 'api')
  useEffect(() => {
    if (authMode !== 'api' || isBootstrapping) return
    let active = true
    getApiOrder(orderId).then(order => { if (active) setApiOrder(order) }).catch(() => {}).finally(() => { if (active) setApiDone(true) })
    return () => { active = false }
  }, [authMode, isBootstrapping, orderId])
  if (isBootstrapping || !apiDone) return null
  const order = authMode === 'api' ? apiOrder : getDemoOrder(orderId, user?.id)

  if (!order) return <Navigate replace to="/shop" />

  const address = order.shippingAddress

  return (
    <main className="order-confirmation-page">
      <section className="order-confirmation-hero">
        <CheckCircle2 size={58} aria-hidden="true" />
        <p className="eyebrow">{t('catalog.paymentSuccessful')}</p>
        <h1>{t('catalog.orderConfirmed')}</h1>
        <p>{t('catalog.confirmationSent').replace('{email}', order.email)}</p>
        <strong>{t('catalog.orderNumber')}: {order.id}</strong>
      </section>

      <div className="order-confirmation-grid">
        <section className="order-confirmation-panel">
          <h2>{t('catalog.orderDetails')}</h2>
          {order.items.map((item) => (
            <div className="order-confirmation-item" key={item.productId}>
              <img src={item.image} alt="" />
              <div><strong>{item.name}</strong><span>{item.quantity} × {formatPrice(item.unitPrice, locale)}</span></div>
              <b>{formatPrice(item.quantity * item.unitPrice, locale)}</b>
            </div>
          ))}
          <div className="order-confirmation-total"><span>{t('catalog.totalPaid')}</span><strong>{formatPrice(order.total, locale)}</strong></div>
        </section>

        <aside className="order-confirmation-panel order-confirmation-meta">
          <div><MapPin size={20} aria-hidden="true" /><section><h2>{t('catalog.shippingTo')}</h2><strong>{order.customerName}</strong><p>{address.street}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}</p></section></div>
          <div><Mail size={20} aria-hidden="true" /><section><h2>{t('catalog.paymentAndStatus')}</h2><p>{t('catalog.cardEnding')} {order.payment.lastFour}<br />{t('catalog.status')}: {t('catalog.processing')}</p></section></div>
        </aside>
      </div>

      <div className="order-confirmation-actions">
        <Link className="btn btn-primary" to="/shop">{t('catalog.continueShopping')}</Link>
        <Link className="btn btn-soft" to="/">{t('nav.home')}</Link>
      </div>
    </main>
  )
}
