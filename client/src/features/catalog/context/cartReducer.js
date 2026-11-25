import { getProduct } from '../data/products.js'

export const initialCartState = {
  items: [],
  isDrawerOpen: false,
}

function normalizeQuantity(product, quantity) {
  if (!product || !Number.isFinite(product.stock) || product.stock < 1) return 0
  return Math.max(1, Math.min(product.stock, Math.trunc(quantity) || 1))
}

export function restoreCartItems(storedItems) {
  if (!Array.isArray(storedItems)) return []
  const items = new Map()
  for (const item of storedItems) {
    if (!item || typeof item.productId !== 'string') continue
    const catalogProduct = getProduct(item.productId)
    const custom = item.product
    const product = catalogProduct || (
      custom?.kind === 'sampler' && custom.id === item.productId &&
      custom.id.startsWith('custom-sampler-') &&
      Number.isFinite(custom.price) && custom.price > 0 &&
      Number.isInteger(custom.stock) && custom.stock > 0 &&
      typeof custom.en?.name === 'string' && custom.en.name.trim()
        ? custom : null
    )
    const rawQuantity = typeof item.quantity === 'number' || typeof item.quantity === 'string'
      ? Number(item.quantity) : NaN
    if (!Number.isFinite(rawQuantity) || Math.trunc(rawQuantity) < 1) continue
    const quantity = normalizeQuantity(product, rawQuantity)
    if (!quantity) continue
    const previous = items.get(item.productId)
    items.set(item.productId, {
      productId: item.productId,
      ...(catalogProduct ? {} : { product }),
      quantity: normalizeQuantity(product, (previous?.quantity || 0) + quantity),
    })
  }
  return [...items.values()]
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const product = action.product || getProduct(action.productId)
      const quantity = normalizeQuantity(product, action.quantity)
      if (!quantity) return state

      const existing = state.items.find((item) => item.productId === action.productId)
      if (!existing) {
        return {
          ...state,
          items: [...state.items, { productId: action.productId, quantity, ...(action.product ? { product } : {}) }],
        }
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? {
                ...item,
                quantity: normalizeQuantity(
                  product,
                  item.quantity + quantity,
                ),
              }
            : item,
        ),
      }
    }

    case 'ADD_CUSTOM_ITEM': {
      const product = action.product
      const quantity = normalizeQuantity(product, action.quantity)
      if (!product?.id || !quantity) return state

      return {
        ...state,
        items: [
          ...state.items,
          { productId: product.id, product, quantity },
        ],
      }
    }

    case 'SET_QUANTITY': {
      const item = state.items.find((cartItem) => cartItem.productId === action.productId)
      const product = item?.product || getProduct(action.productId)
      const quantity = normalizeQuantity(product, action.quantity)
      if (!quantity) {
        return {
          ...state,
          items: state.items.filter((item) => item.productId !== action.productId),
        }
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId ? { ...item, quantity } : item,
        ),
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.productId),
      }

    case 'CLEAR_CART':
      return { ...state, items: [] }

    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true }

    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false }

    default:
      return state
  }
}
