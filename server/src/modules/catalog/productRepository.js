const path = require('node:path')
const { env } = require('../../config/env')
const { query } = require('../../db/mysql')

const seedProducts = require(path.resolve(__dirname, '../../../../db/seed/catalog.json'))
const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig

const sorters = {
  featured: (a, b) => a.featuredOrder - b.featuredOrder,
  price_asc: (a, b) => a.priceCents - b.priceCents,
  price_desc: (a, b) => b.priceCents - a.priceCents,
  cacao_asc: (a, b) => a.cacaoPct - b.cacaoPct,
  cacao_desc: (a, b) => b.cacaoPct - a.cacaoPct,
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
}

function mapSeed(product, locale) {
  const copy = product[locale]
  return {
    id: product.id,
    slug: product.id,
    name: copy.name,
    description: copy.description,
    region: copy.region,
    features: copy.features,
    origin: product.origin,
    cacaoPct: product.cacao,
    type: product.type,
    weight: product.weight,
    priceCents: Math.round(product.price * 100),
    price: product.price,
    seasonal: product.tag === 'seasonal',
    stock: product.stock,
    available: product.stock > 0,
    image: product.image,
    tag: product.tag || null,
    featuredOrder: product.featuredOrder,
  }
}

function mapRow(row) {
  let features = []
  try { features = JSON.parse(row.features || '[]') } catch { features = [] }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    region: row.region,
    features,
    origin: row.origin,
    cacaoPct: Number(row.cacaoPct),
    type: row.type,
    weight: row.weight,
    priceCents: Number(row.priceCents),
    price: Number(row.priceCents) / 100,
    seasonal: Boolean(row.seasonal),
    stock: Number(row.stock),
    available: Number(row.stock) > 0,
    image: row.image || null,
    tag: row.seasonal ? 'seasonal' : null,
  }
}

async function listJson(filters) {
  const origins = new Set(filters.origins.map(origin => origin.toLowerCase()))
  const search = filters.search.toLowerCase()
  const products = seedProducts
    .map(product => mapSeed(product, filters.locale))
    .filter(product => !origins.size || origins.has(product.origin.toLowerCase()))
    .filter(product => product.cacaoPct >= filters.minCacao && product.cacaoPct <= filters.maxCacao)
    .filter(product => !filters.inStock || product.stock > 0)
    .filter(product => !search || [product.name, product.description, product.origin, product.region, product.type]
      .some(value => String(value || '').toLowerCase().includes(search)))
    .sort(sorters[filters.sort])
  const total = products.length
  const offset = (filters.page - 1) * filters.limit
  return { products: products.slice(offset, offset + filters.limit), total }
}

async function listMysql(filters) {
  const where = ['p.is_active = TRUE']
  const params = {
    locale: filters.locale,
    minCacao: filters.minCacao,
    maxCacao: filters.maxCacao,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
  }
  where.push('p.cacao_percentage BETWEEN :minCacao AND :maxCacao')
  if (filters.origins.length) {
    const placeholders = filters.origins.map((origin, index) => {
      params[`origin${index}`] = origin
      return `:origin${index}`
    })
    where.push(`LOWER(p.origin) IN (${placeholders.map(name => `LOWER(${name})`).join(', ')})`)
  }
  if (filters.inStock) where.push('(i.on_hand - i.reserved) > 0')
  if (filters.search) {
    params.search = `%${filters.search}%`
    where.push(`(
      COALESCE(pt.translated_name, p.name) LIKE :search OR
      COALESCE(pt.translated_description, p.description) LIKE :search OR
      COALESCE(pt.translated_region, '') LIKE :search OR
      p.origin LIKE :search OR p.type LIKE :search
    )`)
  }
  const orderBy = {
    featured: 'p.created_at ASC, p.name ASC',
    price_asc: 'p.price_cents ASC, p.name ASC',
    price_desc: 'p.price_cents DESC, p.name ASC',
    cacao_asc: 'p.cacao_percentage ASC, p.name ASC',
    cacao_desc: 'p.cacao_percentage DESC, p.name ASC',
    name_asc: 'COALESCE(pt.translated_name, p.name) ASC',
    name_desc: 'COALESCE(pt.translated_name, p.name) DESC',
  }[filters.sort]
  const joins = `
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale_code = :locale
    JOIN inventory i ON i.product_id = p.id`
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products p ${joins} WHERE ${where.join(' AND ')}`, params)
  const rows = await query(
    `SELECT p.id, p.slug, COALESCE(pt.translated_name, p.name) AS name,
      COALESCE(pt.translated_description, p.description) AS description,
      pt.translated_region AS region, pt.translated_features AS features,
      p.origin, p.cacao_percentage AS cacaoPct, p.type, p.weight_label AS weight,
      p.price_cents AS priceCents, p.is_seasonal AS seasonal,
      GREATEST(i.on_hand - i.reserved, 0) AS stock,
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
       ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) AS image
     FROM products p ${joins}
     WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
    params,
  )
  return { products: rows.map(mapRow), total: Number(total) }
}

async function list(filters) {
  return useJson ? listJson(filters) : listMysql(filters)
}

module.exports = { list }
