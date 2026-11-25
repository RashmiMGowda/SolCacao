const express = require('express')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const repository = require('./productRepository')

const router = express.Router()
const allowedSorts = new Set(['featured', 'price_asc', 'price_desc', 'cacao_asc', 'cacao_desc', 'name_asc', 'name_desc'])

function integer(value, fallback, min, max, name) {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}.`)
  return parsed
}

function filtersFrom(query) {
  const locale = query.locale || 'en'
  if (!['en', 'es'].includes(locale)) throw new HttpError(400, 'locale must be en or es.')
  const origins = typeof query.origin === 'string' ? query.origin.split(',').map(value => value.trim()).filter(Boolean) : []
  if (origins.length > 10 || origins.some(value => value.length > 100)) throw new HttpError(400, 'origin contains too many or invalid values.')
  let minCacao = integer(query.minCacao, 0, 0, 100, 'minCacao')
  let maxCacao = integer(query.maxCacao, 100, 0, 100, 'maxCacao')
  if (query.cacaoPct != null && query.cacaoPct !== '') {
    const match = String(query.cacaoPct).match(/^(\d{1,3})(?:-(\d{1,3}))?$/)
    if (!match) throw new HttpError(400, 'cacaoPct must be a percentage or range such as 70 or 55-85.')
    minCacao = integer(match[1], 0, 0, 100, 'cacaoPct')
    maxCacao = integer(match[2] ?? match[1], 100, 0, 100, 'cacaoPct')
  }
  if (minCacao > maxCacao) throw new HttpError(400, 'Minimum cacao percentage cannot exceed maximum cacao percentage.')
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search.length > 100) throw new HttpError(400, 'search must use no more than 100 characters.')
  const sort = query.sort || 'featured'
  if (!allowedSorts.has(sort)) throw new HttpError(400, 'Unsupported sort value.')
  if (query.inStock != null && !['true', 'false'].includes(query.inStock)) throw new HttpError(400, 'inStock must be true or false.')
  return {
    locale,
    origins,
    minCacao,
    maxCacao,
    search,
    sort,
    inStock: query.inStock === 'true',
    page: integer(query.page, 1, 1, 100000, 'page'),
    limit: integer(query.limit, 12, 1, 50, 'limit'),
  }
}

router.get('/', asyncHandler(async (req, res) => {
  const filters = filtersFrom(req.query)
  const { products, total } = await repository.list(filters)
  const pages = total ? Math.ceil(total / filters.limit) : 0
  res.json({
    products,
    pagination: { page: filters.page, limit: filters.limit, total, pages },
    filters: {
      locale: filters.locale,
      origin: filters.origins,
      cacaoPct: { min: filters.minCacao, max: filters.maxCacao },
      search: filters.search,
      sort: filters.sort,
      inStock: filters.inStock,
    },
  })
}))

module.exports = { productRouter: router, filtersFrom }
