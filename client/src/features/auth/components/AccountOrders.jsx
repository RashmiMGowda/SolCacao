import { Link } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { formatPrice } from '../../catalog/data/products'
import { getDemoOrdersForUser } from '../../catalog/services/checkoutService'
import { listApiOrders } from '../../catalog/services/orderService'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'

export function AccountOrders({ userId, recent = false }) {
  const { locale } = useLocalization()
  const { authMode } = useAuth()
  const [apiOrders, setApiOrders] = useState([])
  useEffect(() => {
    if (authMode !== 'api') return
    let active = true
    listApiOrders().then(orders => { if (active) setApiOrders(orders) }).catch(() => {})
    return () => { active = false }
  }, [authMode])
  const orders = authMode === 'api' ? apiOrders : getDemoOrdersForUser(userId)
  const visibleOrders = recent ? orders.slice(0, 3) : orders

  if (!orders.length) return <p>{locale === 'es' ? 'Todavía no hay pedidos recientes.' : 'No recent orders yet.'}</p>

  return (
    <div className="account-order-list">
      {visibleOrders.map((order) => (
        <div className="account-order-row" key={order.id}>
          <div>
            <Link to={`/order-confirmation/${order.id}`}>{order.id}</Link>
            <p>
              {new Date(order.createdAt).toLocaleDateString(locale)} · {order.itemCount}{' '}
              {locale === 'es'
                ? order.itemCount === 1 ? 'artículo' : 'artículos'
                : order.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          <strong>{formatPrice(order.total, locale)}</strong>
        </div>
      ))}
    </div>
  )
}
