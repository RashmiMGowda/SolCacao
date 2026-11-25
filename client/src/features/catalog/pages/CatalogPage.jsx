import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalization } from '../../localization/hooks/useLocalization'
import { ProductCard } from '../components/ProductCard'
import { useProducts } from '../hooks/useProducts'
import '../catalog.css'

const PAGE_SIZE = 6
const CACAO_RANGES = [
  { id: '45-60', label: '45–60%', min: 45, max: 60 },
  { id: '61-75', label: '61–75%', min: 61, max: 75 },
  { id: '76-90', label: '76–90%', min: 76, max: 90 },
]
const PRODUCT_TYPES = ['dark', 'milk', 'gifts']

function toggleValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export function CatalogPage() {
  const { locale, t } = useLocalization()
  const { products, loading, error } = useProducts(locale)
  const productOrigins = [...new Set(products.map(product => product.origin))].sort()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [origins, setOrigins] = useState([])
  const [cacaoRanges, setCacaoRanges] = useState([])
  const [types, setTypes] = useState([])
  const [maxPrice, setMaxPrice] = useState(40)
  const [priceDraft, setPriceDraft] = useState(40)
  const [sort, setSort] = useState('featured')
  const [page, setPage] = useState(1)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const result = products.filter((product) => {
      const copy = product[locale] || product.en
      const searchText = [
        product.en.name,
        product.es.name,
        product.en.region,
        product.es.region,
        product.origin,
        product.cacao,
        product.type,
      ]
        .join(' ')
        .toLowerCase()

      const matchesCacao = cacaoRanges.some((rangeId) => {
        const range = CACAO_RANGES.find((item) => item.id === rangeId)
        return range && product.cacao >= range.min && product.cacao <= range.max
      })

      return (
        (!normalizedQuery || searchText.includes(normalizedQuery) || copy.name.toLowerCase().includes(normalizedQuery)) &&
        (!origins.length || origins.includes(product.origin)) &&
        (!cacaoRanges.length || matchesCacao) &&
        (!types.length || types.includes(product.type)) &&
        product.price <= maxPrice
      )
    })

    return result.sort((first, second) => {
      if (sort === 'price-asc') return first.price - second.price
      if (sort === 'price-desc') return second.price - first.price
      if (sort === 'cacao-desc') return second.cacao - first.cacao
      return first.featuredOrder - second.featuredOrder
    })
  }, [cacaoRanges, locale, maxPrice, origins, products, query, sort, types])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const hasActiveFilters = Boolean(
    query || origins.length || cacaoRanges.length || types.length || priceDraft < 40,
  )

  function updateQuery(value) {
    setQuery(value)
    setPage(1)
    const nextParams = new URLSearchParams(searchParams)
    if (value.trim()) nextParams.set('q', value)
    else nextParams.delete('q')
    setSearchParams(nextParams, { replace: true })
  }

  function clearFilters() {
    setQuery('')
    setOrigins([])
    setCacaoRanges([])
    setTypes([])
    setMaxPrice(40)
    setPriceDraft(40)
    setSort('featured')
    setPage(1)
    setSearchParams({}, { replace: true })
  }

  function applyPriceFilter(value) {
    const nextPrice = Number(value)
    setPriceDraft(nextPrice)
    setMaxPrice(nextPrice)
    setPage(1)
  }

  function getFilterCount(filterName, value) {
    return products.filter((product) => {
      if (filterName === 'origin') return product.origin === value
      if (filterName === 'type') return product.type === value
      const range = CACAO_RANGES.find((item) => item.id === value)
      return range && product.cacao >= range.min && product.cacao <= range.max
    }).length
  }

  const filterPanel = (
    <aside className={`catalog-filters ${isMobileFiltersOpen ? 'is-open' : ''}`}>
      <div className="catalog-filter-heading">
        <div>
          <p>{t('catalog.refine')}</p>
          <h2>{t('catalog.filters')}</h2>
        </div>
        <button
          aria-label={t('catalog.closeFilters')}
          className="catalog-filter-close"
          type="button"
          onClick={() => setIsMobileFiltersOpen(false)}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <fieldset className="catalog-filter-group">
        <legend>{t('catalog.origin')}</legend>
        {productOrigins.map((origin) => (
          <label key={origin}>
            <span><input checked={origins.includes(origin)} type="checkbox" onChange={() => { setOrigins((current) => toggleValue(current, origin)); setPage(1) }} />{origin}</span>
            <small>{getFilterCount('origin', origin)}</small>
          </label>
        ))}
      </fieldset>

      <fieldset className="catalog-filter-group">
        <legend>{t('catalog.cacaoPercentage')}</legend>
        {CACAO_RANGES.map((range) => (
          <label key={range.id}>
            <span><input checked={cacaoRanges.includes(range.id)} type="checkbox" onChange={() => { setCacaoRanges((current) => toggleValue(current, range.id)); setPage(1) }} />{range.label}</span>
            <small>{getFilterCount('cacao', range.id)}</small>
          </label>
        ))}
      </fieldset>

      <fieldset className="catalog-filter-group">
        <legend>{t('catalog.chocolateType')}</legend>
        {PRODUCT_TYPES.map((type) => (
          <label key={type}>
            <span><input checked={types.includes(type)} type="checkbox" onChange={() => { setTypes((current) => toggleValue(current, type)); setPage(1) }} />{t(`catalog.types.${type}`)}</span>
            <small>{getFilterCount('type', type)}</small>
          </label>
        ))}
      </fieldset>

      <div className="catalog-price-filter">
        <div><label htmlFor="catalog-price">{t('catalog.maximumPrice')}</label><strong>{`$${priceDraft}`}</strong></div>
        <input
          id="catalog-price"
          max="40"
          min="8"
          step="1"
          type="range"
          value={priceDraft}
          onBlur={(event) => applyPriceFilter(event.currentTarget.value)}
          onChange={(event) => setPriceDraft(Number(event.target.value))}
          onKeyUp={(event) => applyPriceFilter(event.currentTarget.value)}
          onPointerUp={(event) => applyPriceFilter(event.currentTarget.value)}
        />
        <div className="catalog-price-scale"><span>$8</span><span>$40</span></div>
      </div>

      <button className="catalog-clear-button" disabled={!hasActiveFilters} type="button" onClick={clearFilters}>
        {t('catalog.clearAll')}
      </button>
    </aside>
  )

  return (
    <main className="catalog-page">
      <header className="catalog-hero">
        <div>
          <p className="eyebrow">{t('catalog.eyebrow')}</p>
          <h1>{t('catalog.title')}</h1>
          <p>{t('catalog.intro')}</p>
        </div>
        <div className="catalog-hero-stat"><strong>{products.length}</strong><span>{t('catalog.smallBatchSelections')}</span></div>
      </header>

      <div className="catalog-mobile-tools">
        <button type="button" onClick={() => setIsMobileFiltersOpen(true)}>
          <SlidersHorizontal size={18} aria-hidden="true" />
          {t('catalog.filters')}
        </button>
      </div>

      <div className="catalog-layout">
        {filterPanel}
        {isMobileFiltersOpen ? <button aria-label={t('catalog.closeFilters')} className="catalog-filter-overlay" type="button" onClick={() => setIsMobileFiltersOpen(false)} /> : null}

        <section className="catalog-results" aria-live="polite">
          <div className="catalog-search-row">
            <label className="catalog-search">
              <Search size={19} aria-hidden="true" />
              <input aria-label={t('catalog.searchLabel')} placeholder={t('catalog.searchPlaceholder')} type="search" value={query} onChange={(event) => updateQuery(event.target.value)} />
            </label>
            <label className="catalog-sort">
              <span>{t('catalog.sortBy')}</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
                <option value="featured">{t('catalog.sort.featured')}</option>
                <option value="price-asc">{t('catalog.sort.priceAsc')}</option>
                <option value="price-desc">{t('catalog.sort.priceDesc')}</option>
                <option value="cacao-desc">{t('catalog.sort.cacao')}</option>
              </select>
            </label>
          </div>

          <div className="catalog-result-meta">
            <p><strong>{filteredProducts.length}</strong> {t('catalog.products')}</p>
            {hasActiveFilters ? <button type="button" onClick={clearFilters}>{t('catalog.clearAll')}</button> : null}
          </div>

          {loading || error ? (
            <p role={error ? 'alert' : 'status'}>{locale === 'es'
              ? (error ? 'No se pudo cargar el catálogo.' : 'Cargando productos…')
              : (error ? 'Could not load the catalog.' : 'Loading products…')}</p>
          ) : visibleProducts.length ? (
            <div className="catalog-grid">
              {visibleProducts.map((product) => <ProductCard product={product} key={product.id} />)}
            </div>
          ) : (
            <div className="catalog-no-results">
              <Search size={38} aria-hidden="true" />
              <h2>{t('catalog.noResults')}</h2>
              <p>{t('catalog.noResultsBody')}</p>
              <button className="btn btn-primary" type="button" onClick={clearFilters}>{t('catalog.clearFilters')}</button>
            </div>
          )}

          {pageCount > 1 ? (
            <nav className="catalog-pagination" aria-label={t('catalog.pagination')}>
              <button aria-label={t('catalog.previous')} disabled={currentPage === 1} type="button" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={18} /></button>
              <span>{t('catalog.page')} {currentPage} / {pageCount}</span>
              <button aria-label={t('catalog.next')} disabled={currentPage === pageCount} type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={18} /></button>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  )
}
