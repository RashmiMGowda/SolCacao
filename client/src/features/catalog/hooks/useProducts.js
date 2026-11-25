import { useEffect, useState } from 'react'
import { getAuthMode } from '../../auth/services/authService'
import { products as demoProducts } from '../data/products'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

async function loadProducts(locale, signal) {
  const products = []
  let page = 1
  let pages
  do {
    const params = new URLSearchParams({ locale, page: String(page), limit: '50' })
    const response = await fetch(`${baseUrl}/products?${params}`, { signal })
    if (!response.ok) throw new Error('Could not load the product catalog.')
    const result = await response.json()
    for (const product of result.products) {
      const { name, description, region, features } = product
      const copy = { name, description, region, features }
      products.push({ ...product, cacao: product.cacaoPct, featuredOrder: products.length, en: copy, es: copy })
    }
    pages = result.pagination.pages
    page += 1
  } while (page <= pages)
  return products
}

export function useProducts(locale) {
  const apiMode = getAuthMode() === 'api'
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!apiMode) return
    const controller = new AbortController()
    loadProducts(locale, controller.signal).then(
      products => { if (!controller.signal.aborted) setResult({ locale, products }) },
      () => { if (!controller.signal.aborted) setResult({ locale, products: [], error: true }) },
    )
    return () => controller.abort()
  }, [apiMode, locale])

  if (!apiMode) return { products: demoProducts }
  if (result?.locale !== locale) return { products: [], loading: true }
  return result
}
