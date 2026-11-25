import { useUiText } from '../localization/hooks/useUiText'
import { GIFT_MESSAGE_LIMIT } from './contactValidation'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../catalog/hooks/useCart'
import { useLocalization } from '../localization/hooks/useLocalization'
import { listSavedSamplers, persistSampler } from './samplerService'

const sizes = [{ pieces: 6, price: 18 }, { pieces: 12, price: 30 }, { pieces: 24, price: 52 }]
const chocolates = ['70% Dark Cacao', 'Milk Chocolate', 'Raspberry Dark Chocolate', 'Orange Infusion']
const packages = [{ name: 'Classic Box', fee: 0 }, { name: 'Luxury Gift Box', fee: 5 }, { name: 'Event Sleeve', fee: 3 }]
const samplerImage = 'https://img.shoplineapp.com/media/image_clips/691d7ff7c46aaf00102334d1/original.jpg?1763540983=&owner_id=5ca6dda99972ff000189e573'
const spanishProducts = { '70% Dark Cacao': 'Cacao oscuro 70%', 'Milk Chocolate': 'Chocolate con leche', 'Raspberry Dark Chocolate': 'Chocolate oscuro con frambuesa', 'Orange Infusion': 'Infusión de naranja' }
const spanishPackages = { 'Classic Box': 'Caja clásica', 'Luxury Gift Box': 'Caja de regalo de lujo', 'Event Sleeve': 'Funda para eventos' }
const text = {
  en: { eyebrow: 'Make it your own', title: 'Build Your Sampler', intro: 'Create a personalized selection for yourself, a gift, or an event.', done: 'Sampler complete', ready: 'Your sampler is ready', added: 'Added to cart', prototype: 'Your customized sampler and all of its selections are now in your cart.', again: 'Build another sampler', steps: ['Box size', 'Chocolates', 'Packaging', 'Review'], size: 'Choose your box size', chocolate: 'Choose your chocolates', selected: 'pieces selected', packaging: 'Packaging & gift message', packagingLabel: 'Packaging', gift: 'Gift message', optional: '(optional)', review: 'Review your sampler', quantity: 'Quantity', back: 'Back', next: 'Next', add: 'Add sampler to cart', error: 'Please choose exactly', saving: 'Saving sampler…', saveFailed: 'Could not save your sampler. Please try again.' },
  es: { eyebrow: 'Hazlo a tu manera', title: 'Crea tu surtido', intro: 'Crea una selección personalizada para ti, un regalo o un evento.', done: 'Surtido completado', ready: 'Tu surtido está listo', added: 'Añadido al carrito', prototype: 'Tu surtido personalizado y todas sus selecciones ya están en el carrito.', again: 'Crear otro surtido', steps: ['Tamaño de caja', 'Chocolates', 'Empaque', 'Revisión'], size: 'Elige el tamaño de caja', chocolate: 'Elige tus chocolates', selected: 'piezas seleccionadas', packaging: 'Empaque y mensaje de regalo', packagingLabel: 'Empaque', gift: 'Mensaje de regalo', optional: '(optional)', review: 'Revisa tu surtido', quantity: 'Cantidad', back: 'Atrás', next: 'Siguiente', add: 'Añadir surtido al carrito', error: 'Elige exactamente', saving: 'Guardando surtido…', saveFailed: 'No se pudo guardar tu surtido. Inténtalo de nuevo.' },
}
const savedText = {
  en: { title: 'Saved samplers', loading: 'Loading saved samplers…', loadFailed: 'Could not load saved samplers. Check that the API is running.' },
  es: { title: 'Surtidos guardados', loading: 'Cargando surtidos guardados…', loadFailed: 'No se pudieron cargar los surtidos. Comprueba que la API esté activa.' },
}
function createSamplerId() {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `custom-sampler-${suffix}`
}

export default function SamplerPage() {
  const ui = useUiText()
  const [step, setStep] = useState(1)
  const [size, setSize] = useState(sizes[1])
  const [quantities, setQuantities] = useState({})
  const [packaging, setPackaging] = useState(packages[1])
  const [giftMessage, setGiftMessage] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSamplers, setSavedSamplers] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const { addCustomItem, openCart } = useCart()
  const { locale } = useLocalization()
  const t = text[locale]
  useEffect(() => {
    let active = true
    listSavedSamplers()
      .then((samplers) => { if (active) setSavedSamplers(samplers) })
      .catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoadingSaved(false) })
    return () => { active = false }
  }, [])
  const productLabel = (name) => locale === 'es' ? spanishProducts[name] : name
  const packageLabel = (name) => locale === 'es' ? spanishPackages[name] : name
  const selected = useMemo(
    () => Object.entries(quantities).filter(([, value]) => value > 0),
    [quantities],
  )
  const count = selected.reduce((sum, [, value]) => sum + Number(value), 0)
  const total = size.price + packaging.fee

  function setQuantity(name, value) {
    setQuantities((current) => ({
      ...current,
      [name]: Math.max(0, Math.min(size.pieces, Math.floor(Number(value) || 0))),
    }))
  }

  function next() {
    if (step === 3 && giftMessage.length > GIFT_MESSAGE_LIMIT) {
      setError(locale === 'es' ? 'Usa un máximo de 500 caracteres.' : 'Use no more than 500 characters.')
      return
    }
    if (step === 2 && count !== size.pieces) {
      setError(`${t.error} ${size.pieces} ${locale === 'es' ? 'piezas.' : 'pieces.'}`)
      return
    }

    setError('')
    setStep((current) => current + 1)
  }

  async function addSamplerToCart() {
    if (giftMessage.length > GIFT_MESSAGE_LIMIT) {
      setError(locale === 'es' ? 'Usa un máximo de 500 caracteres.' : 'Use no more than 500 characters.')
      setStep(3)
      return
    }
    if (count !== size.pieces) {
      setError(`${t.error} ${size.pieces} ${locale === 'es' ? 'piezas.' : 'pieces.'}`)
      setStep(2)
      return
    }
    const selections = selected.map(([name, quantity]) => ({ name, quantity: Number(quantity) }))
    const selectionText = selections.map(({ name, quantity }) => `${quantity}× ${name}`).join(', ')
    const spanishSelectionText = selections
      .map(({ name, quantity }) => `${quantity}× ${spanishProducts[name]}`)
      .join(', ')

    setSaving(true)
    setError('')
    let savedSampler
    try {
      savedSampler = await persistSampler({
        boxSize: size.pieces,
        packaging: packaging.name,
        selections,
        giftMessage: giftMessage.trim(),
      })
    } catch {
      setError(t.saveFailed)
      setSaving(false)
      return
    }

    addCustomItem({
      id: createSamplerId(),
      kind: 'sampler',
      price: savedSampler ? savedSampler.totalPriceCents / 100 : total,
      stock: 20,
      weight: `${size.pieces} pieces`,
      image: samplerImage,
      cartMeta: {
        en: `${size.pieces} pieces · ${packaging.name}`,
        es: `${size.pieces} piezas · ${spanishPackages[packaging.name]}`,
      },
      en: {
        name: `Custom ${size.pieces}-Piece Sampler`,
        region: packaging.name,
        description: selectionText,
        features: selections.map(({ name, quantity }) => `${quantity}× ${name}`),
      },
      es: {
        name: `Surtido personalizado de ${size.pieces} piezas`,
        region: spanishPackages[packaging.name],
        description: spanishSelectionText,
        features: selections.map(({ name, quantity }) => `${quantity}× ${spanishProducts[name]}`),
      },
      sampler: {
        savedSamplerId: savedSampler?.id || null,
        pieces: size.pieces,
        selections,
        packaging: packaging.name,
        giftMessage: giftMessage.trim(),
      },
    })
    if (savedSampler) setSavedSamplers((current) => [savedSampler, ...current])
    setSaving(false)
    setComplete(true)
    openCart()
  }

  function resetSampler() {
    setComplete(false)
    setStep(1)
    setQuantities({})
    setGiftMessage('')
  }

  if (complete) {
    return (
      <main className="page-wrap contact-sampler-page">
        <p className="eyebrow">{t.done}</p>
        <h1>{t.ready}</h1>
        <div className="form-card success">
          <strong>{t.added}</strong>
          <p>{t.prototype}</p>
          <button className="primary-button" type="button" onClick={resetSampler}>{t.again}</button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap contact-sampler-page">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <p className="intro">{t.intro}</p>
      {loadingSaved && <p role="status">{savedText[locale].loading}</p>}
      {loadError && <p className="error" role="alert">{savedText[locale].loadFailed}</p>}
      {savedSamplers.length > 0 && <section aria-label={savedText[locale].title} className="form-card">
        <h2 className="section-title">{savedText[locale].title}</h2>
        <ul>{savedSamplers.map((sampler) => <li key={sampler.id}>
          {sampler.boxSize} {locale === 'es' ? 'piezas' : 'pieces'} · {sampler.packaging} · ${(sampler.totalPriceCents / 100).toFixed(2)}
        </li>)}</ul>
      </section>}
      <ol className="steps" aria-label={ui("Sampler progress")}>
        {t.steps.map((label, index) => <li className={index + 1 === step ? 'active' : ''} key={label}>{index + 1}. {label}</li>)}
      </ol>
      <div className="wizard-card">
        {error && <p className="error" role="alert">{ui(error)}</p>}
        {step === 1 && <><h2 className="section-title">{t.size}</h2><div className="size-grid">{sizes.map((option) => <button className={`size-card ${size.pieces === option.pieces ? 'selected' : ''}`} key={option.pieces} type="button" onClick={() => setSize(option)}><strong>{option.pieces} {locale === 'es' ? 'piezas' : 'pieces'}</strong><span>${option.price.toFixed(2)}</span></button>)}</div></>}
        {step === 2 && <><h2 className="section-title">{t.chocolate}</h2><p className="count">{count} / {size.pieces} {t.selected}</p><div className="chocolate-grid">{chocolates.map((chocolate) => <article className="chocolate-card" key={chocolate}><strong>{productLabel(chocolate)}</strong><p>{locale === 'es' ? 'Selección artesanal de SolCacao' : 'Handcrafted SolCacao selection'}</p><label className="field">{t.quantity}<input min="0" max={size.pieces} type="number" value={quantities[chocolate] || 0} onChange={(event) => setQuantity(chocolate, event.target.value)} /></label></article>)}</div></>}
        {step === 3 && <><h2 className="section-title">{t.packaging}</h2><label className="field">{t.packagingLabel}<select value={packaging.name} onChange={(event) => setPackaging(packages.find((item) => item.name === event.target.value))}>{packages.map((item) => <option value={item.name} key={item.name}>{packageLabel(item.name)}{item.fee ? ` (+$${item.fee.toFixed(2)})` : ''}</option>)}</select></label><label className="field">{t.gift} <span>{t.optional}</span><textarea rows="5" value={giftMessage} onChange={(event) => setGiftMessage(event.target.value)} /></label></>}
        {step === 4 && <><h2 className="section-title">{t.review}</h2><dl className="summary"><div><dt>{t.steps[0]}</dt><dd>{size.pieces} {locale === 'es' ? 'piezas' : 'pieces'}</dd></div>{selected.map(([name, quantity]) => <div key={name}><dt>{productLabel(name)}</dt><dd>{quantity} {locale === 'es' ? 'piezas' : 'pieces'}</dd></div>)}<div><dt>{t.packagingLabel}</dt><dd>{packageLabel(packaging.name)}</dd></div>{giftMessage && <div><dt>{t.gift}</dt><dd>{giftMessage}</dd></div>}<div><dt>Total</dt><dd>${total.toFixed(2)}</dd></div></dl></>}
        <div className="wizard-actions">
          <button className="secondary-button" type="button" onClick={() => setStep((current) => current - 1)} disabled={step === 1}>{t.back}</button>
          {step < 4
            ? <button className="primary-button" type="button" onClick={next}>{t.next}</button>
            : <button className="primary-button" type="button" onClick={addSamplerToCart} disabled={saving}>{saving ? t.saving : t.add}</button>}
        </div>
      </div>
    </main>
  )
}
