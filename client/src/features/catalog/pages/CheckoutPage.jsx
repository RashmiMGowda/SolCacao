import { CreditCard, LoaderCircle, LockKeyhole, PackageCheck, Sparkles, Truck } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { useToast } from '../../../shared/toast/useToast'
import { formatPrice, getProductCopy } from '../data/products'
import { useCart } from '../hooks/useCart'
import {
  createOrderId,
  getCardLastFour,
  isDeclinedDemoCard,
  saveDemoOrder,
  validateCheckout,
  readCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutDraft,
} from '../services/checkoutService'
import { guestCartSession } from '../services/cartService'
import { createApiOrder } from '../services/orderService'
import '../catalog.css'

const DEMO_CHECKOUT_VALUES = {
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'customer@solcacao.test',
  phone: '555-0101',
  street: '123 Main Street',
  city: 'Arlington',
  state: 'TX',
  postalCode: '76010',
  country: 'United States',
  cardName: 'Alex Morgan',
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123',
}

function CheckoutField({ autoComplete, error, label, name, onChange, placeholder, type = 'text', value }) {
  return (
    <label className={`checkout-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={error ? 'true' : undefined}
        autoComplete={autoComplete}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <small id={`${name}-error`}>{error}</small> : null}
    </label>
  )
}

export function CheckoutPage() {
  const { user, isBootstrapping, authMode } = useAuth()
  if (isBootstrapping) return null
  return <CheckoutForm authMode={authMode} key={user?.id || 'guest'} user={user} />
}

function CheckoutForm({ authMode, user }) {
  const { locale, t } = useLocalization()
  const { clearCart, detailedItems, itemCount, subtotal , isLoading } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [hasPlacedOrder, setHasPlacedOrder] = useState(false)
  const [errors, setErrors] = useState({})
  const [paymentError, setPaymentError] = useState('')
  const address = user?.addresses?.[0] || {}
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionLock = useRef(false)
  const [formValues, setFormValues] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: address.street || '',
    city: address.city || '',
    state: address.state || '',
    postalCode: address.postalCode || '',
    country: address.country || 'United States',
    ...readCheckoutDraft(user?.id),
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  }))
  const tax = subtotal * 0.08
  const total = subtotal + tax

  if (isLoading) return null
  if (!detailedItems.length && !hasPlacedOrder) return <Navigate replace to="/cart" />

  function errorMessage(code) {
    return code ? t(`catalog.checkoutErrors.${code}`) : ''
  }

  function updateField(event) {
    const { name, value } = event.target
    const nextValues = { ...formValues, [name]: value }
    saveCheckoutDraft(user?.id, nextValues)
    setFormValues(nextValues)
    setErrors((current) => ({ ...current, [name]: undefined }))
    setPaymentError('')
  }

  function fillDemoCheckout(cardNumber = DEMO_CHECKOUT_VALUES.cardNumber) {
    saveCheckoutDraft(user?.id, DEMO_CHECKOUT_VALUES)
    setFormValues({ ...DEMO_CHECKOUT_VALUES, cardNumber })
    setErrors({})
    setPaymentError('')
    showToast({ message: t('catalog.demoCheckoutFilled') })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionLock.current) return
    setPaymentError('')
    const values = formValues
    const validationErrors = validateCheckout(values)

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      event.currentTarget.elements.namedItem(Object.keys(validationErrors)[0])?.focus()
      showToast({ message: t('catalog.reviewCheckoutFields'), type: 'error' })
      return
    }

    setErrors({})
    submissionLock.current = true
    setIsSubmitting(true)
    try {
    showToast({ message: t('catalog.processingDemoPayment') })
    await new Promise((resolve) => window.setTimeout(resolve, 650))

    if (isDeclinedDemoCard(values.cardNumber)) {
      setPaymentError(t('catalog.demoCardDeclined'))
      setIsSubmitting(false)
      showToast({ message: t('catalog.demoCardDeclined'), type: 'error' })
      return
    }

    let orderId = createOrderId()
    const order = {
      id: orderId,
      userId: user?.id || null,
      createdAt: new Date().toISOString(),
      email: values.email.trim(),
      customerName: `${values.firstName.trim()} ${values.lastName.trim()}`,
      phone: values.phone?.trim() || '',
      shippingAddress: {
        street: values.street.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country.trim(),
      },
      items: detailedItems.map(({ product, quantity }) => ({
        productId: product.id,
        name: getProductCopy(product, locale).name,
        image: product.image,
        quantity,
        unitPrice: product.price,
        configuration: product.sampler || null,
      })),
      itemCount,
      subtotal,
      tax,
      total,
      payment: {
        method: 'Credit / Debit Card',
        lastFour: getCardLastFour(values.cardNumber),
        status: 'PAID',
      },
      status: 'PROCESSING',
    }

    if (authMode === 'api') {
      const savedOrder = await createApiOrder({
        ...(user ? {} : { sessionId: guestCartSession() }),
        email: values.email.trim(),
        phone: values.phone?.trim() || '',
        paymentLastFour: getCardLastFour(values.cardNumber),
        shippingAddress: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          street: values.street.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country.trim(),
        },
        items: detailedItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      })
      orderId = savedOrder.id
    } else {
      if (!order.userId) {
        order.guestToken = crypto.randomUUID()
        window.sessionStorage.setItem(`solcacao.guestOrder.${orderId}`, order.guestToken)
      }
      saveDemoOrder(order)
    }
    clearCheckoutDraft(user?.id)
    setHasPlacedOrder(true)
    clearCart()
    showToast({ message: t('catalog.orderPlacedSuccessfully') })
    navigate(`/order-confirmation/${orderId}`, { replace: true })
    } catch {
      setPaymentError(t('catalog.checkoutErrors.storage'))
      showToast({ message: t('catalog.checkoutErrors.storage'), type: 'error' })
    } finally {
      submissionLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="checkout-page">
      <header className="checkout-heading">
        <p className="eyebrow">{t('catalog.secureDemoCheckout')}</p>
        <h1>{t('catalog.deliveryAndPayment')}</h1>
        <p>{t('catalog.checkoutIntro')}</p>
      </header>

      <form className="checkout-layout" noValidate onSubmit={handleSubmit}>
        <div className="checkout-sections">
          <section className="checkout-demo-fill-card">
            <div><Sparkles size={20} aria-hidden="true" /><section><strong>{t('catalog.demoCheckout')}</strong><p>{t('catalog.demoCheckoutBody')}</p></section></div>
            <div className="checkout-demo-buttons">
              <button type="button" onClick={() => fillDemoCheckout()}>{t('catalog.fillSuccessfulDemo')}</button>
              <button type="button" onClick={() => fillDemoCheckout('4000 0000 0000 0002')}>{t('catalog.fillDeclinedDemo')}</button>
            </div>
          </section>

          <section className="checkout-panel">
            <div className="checkout-section-heading">
              <Truck size={22} aria-hidden="true" />
              <div><span>{t('catalog.checkoutStep').replace('{step}', '1')}</span><h2>{t('catalog.contactAndDelivery')}</h2></div>
            </div>
            <div className="checkout-field-grid">
              <CheckoutField autoComplete="given-name" error={errorMessage(errors.firstName)} label={t('catalog.firstName')} name="firstName" onChange={updateField} value={formValues.firstName} />
              <CheckoutField autoComplete="family-name" error={errorMessage(errors.lastName)} label={t('catalog.lastName')} name="lastName" onChange={updateField} value={formValues.lastName} />
              <CheckoutField autoComplete="email" error={errorMessage(errors.email)} label={t('catalog.email')} name="email" onChange={updateField} type="email" value={formValues.email} />
              <CheckoutField autoComplete="tel" error={errorMessage(errors.phone)} label={t('catalog.phone')} name="phone" onChange={updateField} type="tel" value={formValues.phone} />
              <div className="checkout-field-wide"><CheckoutField autoComplete="street-address" error={errorMessage(errors.street)} label={t('catalog.streetAddress')} name="street" onChange={updateField} value={formValues.street} /></div>
              <CheckoutField autoComplete="address-level2" error={errorMessage(errors.city)} label={t('catalog.city')} name="city" onChange={updateField} value={formValues.city} />
              <CheckoutField autoComplete="address-level1" error={errorMessage(errors.state)} label={t('catalog.state')} name="state" onChange={updateField} value={formValues.state} />
              <CheckoutField autoComplete="postal-code" error={errorMessage(errors.postalCode)} label={t('catalog.postalCode')} name="postalCode" onChange={updateField} value={formValues.postalCode} />
              <CheckoutField autoComplete="country-name" error={errorMessage(errors.country)} label={t('catalog.country')} name="country" onChange={updateField} value={formValues.country} />
            </div>
          </section>

          <section className="checkout-panel">
            <div className="checkout-section-heading">
              <CreditCard size={22} aria-hidden="true" />
              <div><span>{t('catalog.checkoutStep').replace('{step}', '2')}</span><h2>{t('catalog.payment')}</h2></div>
            </div>
            <div className="checkout-demo-note">
              <LockKeyhole size={18} aria-hidden="true" />
              <p>{t('catalog.demoPaymentNotice')} <strong>4242 4242 4242 4242</strong></p>
            </div>
            <div className="checkout-field-grid">
              <div className="checkout-field-wide"><CheckoutField autoComplete="cc-name" error={errorMessage(errors.cardName)} label={t('catalog.nameOnCard')} name="cardName" onChange={updateField} value={formValues.cardName} /></div>
              <div className="checkout-field-wide"><CheckoutField autoComplete="cc-number" error={errorMessage(errors.cardNumber)} label={t('catalog.cardNumber')} name="cardNumber" onChange={updateField} placeholder="4242 4242 4242 4242" value={formValues.cardNumber} /></div>
              <CheckoutField autoComplete="cc-exp" error={errorMessage(errors.expiry)} label={t('catalog.expiry')} name="expiry" onChange={updateField} placeholder="MM/YY" value={formValues.expiry} />
              <CheckoutField autoComplete="cc-csc" error={errorMessage(errors.cvv)} label={t('catalog.cvv')} name="cvv" onChange={updateField} placeholder="123" type="password" value={formValues.cvv} />
            </div>
            {paymentError ? <p className="checkout-payment-error" role="alert">{paymentError}</p> : null}
          </section>
        </div>

        <aside className="checkout-summary">
          <div className="checkout-summary-heading"><PackageCheck size={22} aria-hidden="true" /><h2>{t('catalog.orderSummary')}</h2></div>
          <div className="checkout-summary-items">
            {detailedItems.map(({ product, quantity }) => (
              <div className="checkout-summary-item" key={product.id}>
                <img src={product.image} alt="" />
                <div><strong>{getProductCopy(product, locale).name}</strong><span>{quantity} × {formatPrice(product.price, locale)}</span></div>
                <b>{formatPrice(product.price * quantity, locale)}</b>
              </div>
            ))}
          </div>
          <div className="checkout-totals">
            <div><span>{t('catalog.subtotal')}</span><strong>{formatPrice(subtotal, locale)}</strong></div>
            <div><span>{t('catalog.estimatedTax')}</span><strong>{formatPrice(tax, locale)}</strong></div>
            <div><span>{t('catalog.shipping')}</span><strong>{t('catalog.free')}</strong></div>
            <div className="checkout-total"><span>{t('catalog.total')}</span><strong>{formatPrice(total, locale)}</strong></div>
          </div>
          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="checkout-spinner" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            {isSubmitting ? t('catalog.processingPayment') : t('catalog.payAndPlaceOrder')}
          </button>
          <p className="checkout-privacy">{t('catalog.demoPrivacy')}</p>
        </aside>
      </form>
    </main>
  )
}
