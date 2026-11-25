import { useAuth } from '../../auth/hooks/useAuth'
import { requestCart, guestCartSession } from '../services/cartService'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getProduct } from '../data/products'
import { CartContext } from './CartContextValue'
import { cartReducer, initialCartState, restoreCartItems } from './cartReducer'

const CART_STORAGE_KEY = 'solcacao.cart'

function getInitialState() {
  if (typeof window === 'undefined') return initialCartState

  try {
    const storedItems = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]')
    const items = restoreCartItems(storedItems)

    return { ...initialCartState, items }
  } catch {
    return initialCartState
  }
}

export function CartProvider({ children }) {
  const { authMode, user, isBootstrapping } = useAuth()
  const apiMode = authMode === 'api'
  return (
    <CartStore key={apiMode ? (isBootstrapping ? 'loading' : user?.id || 'guest') : 'demo'}
      apiMode={apiMode} isBootstrapping={apiMode && isBootstrapping}>
      {children}
    </CartStore>
  )
}

function fromServer(cart, previous = []) {
  const known = new Map(previous.map(item => [item.productId, item.product]))
  const items = cart.items.map(({ productId, quantity, name, image, unitPriceCents }) => {
    const product = known.get(productId) || getProduct(productId)
    const copy = { name }
    return {
      productId,
      quantity,
      product: {
        id: productId,
        stock: 99,
        en: copy,
        es: copy,
        ...product,
        image,
        price: unitPriceCents / 100,
      },
    }
  })
  return [...items, ...previous.filter(item => item.product?.kind === 'sampler')]
}

// Serialize writes and account switches so sign-in can merge the saved guest cart.
let pendingCart = Promise.resolve()
function enqueueCart(task) {
  pendingCart = pendingCart.then(task).catch(() => {})
}

function CartStore({ children, apiMode, isBootstrapping }) {
  const [state, setState] = useState(() => apiMode ? initialCartState : getInitialState())
  const [isLoading, setIsLoading] = useState(apiMode)
  const [cartError, setCartError] = useState('')
  const current = useRef(state)
  const synchronized = useRef(null)
  const owner = useRef(null)
  const active = useRef(false)

  useEffect(() => {
    if (!apiMode || isBootstrapping) return
    let cancelled = false
    active.current = true
    enqueueCart(async () => {
      if (cancelled) return
      try {
        const token = localStorage.getItem('solcacao.jwt')
        const sessionId = guestCartSession()
        const cart = token
          ? await requestCart('/merge', token, { guestSessionId: sessionId })
          : await requestCart(`?sessionId=${encodeURIComponent(sessionId)}`)
        if (cancelled) return
        owner.current = { token, sessionId }
        synchronized.current = fromServer(cart)
        current.current = { ...current.current, items: synchronized.current }
        setState(current.current)
      } catch (error) {
        if (!cancelled) setCartError(error.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })
    return () => { cancelled = true; active.current = false }
  }, [apiMode, isBootstrapping])

  useEffect(() => {
    if (apiMode) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items))
    } catch { /* Keep the in-memory cart usable if browser storage is unavailable. */ }
  }, [apiMode, state.items])

  const dispatch = useCallback(action => {
    const before = current.current
    const next = cartReducer(before, action)
    if (apiMode && before.items !== next.items && !owner.current) {
      setCartError('The cart is still connecting. Please try again.')
      return
    }
    current.current = next
    setState(next)
    if (!apiMode || before.items === next.items) return
    const { token, sessionId } = owner.current
    const items = next.items.filter(item => item.product?.kind !== 'sampler')
      .map(({ productId, quantity }) => ({ productId, quantity }))
    enqueueCart(async () => {
      try {
        const cart = await requestCart('/persist', token, { sessionId, items })
        synchronized.current = fromServer(cart, next.items)
        if (!active.current || current.current.items !== next.items) return
        current.current = { ...current.current, items: synchronized.current }
        setState(current.current)
        setCartError('')
      } catch (error) {
        if (!active.current || current.current.items !== next.items) return
        current.current = { ...current.current, items: synchronized.current }
        setState(current.current)
        setCartError(error.message)
      }
    })
  }, [apiMode])

  const addItem = useCallback((productId, quantity = 1, product) => {
    dispatch({ type: 'ADD_ITEM', productId, quantity, product })
  }, [dispatch])

  const addCustomItem = useCallback((product, quantity = 1) => {
    dispatch({ type: 'ADD_CUSTOM_ITEM', product, quantity })
  }, [dispatch])

  const setQuantity = useCallback((productId, quantity) => {
    dispatch({ type: 'SET_QUANTITY', productId, quantity })
  }, [dispatch])

  const removeItem = useCallback((productId) => {
    dispatch({ type: 'REMOVE_ITEM', productId })
  }, [dispatch])

  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), [dispatch])
  const openCart = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), [dispatch])
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), [dispatch])

  const detailedItems = useMemo(
    () =>
      state.items
        .map((item) => ({
          ...item,
          product: item.product || getProduct(item.productId),
        }))
        .filter((item) => item.product),
    [state.items],
  )

  const itemCount = useMemo(
    () => state.items.reduce((total, item) => total + item.quantity, 0),
    [state.items],
  )

  const subtotal = useMemo(
    () =>
      detailedItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      ),
    [detailedItems],
  )

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
      addCustomItem,
      addItem,
      clearCart,
      closeCart,
      detailedItems,
      itemCount,
      openCart,
      removeItem,
      setQuantity,
      subtotal,
    }),
    [
      isLoading,
      addCustomItem,
      addItem,
      clearCart,
      closeCart,
      detailedItems,
      itemCount,
      openCart,
      removeItem,
      setQuantity,
      state,
      subtotal,
    ],
  )

  return <CartContext.Provider value={value}>{cartError && <p role="alert" className="page-shell">{cartError}</p>}{children}</CartContext.Provider>
}
