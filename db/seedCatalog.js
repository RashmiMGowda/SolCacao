const { getPool } = require('../server/src/db/mysql')
const products = require('./seed/catalog.json')
const translations = require('./seed/localization.json')
const { createHash } = require('node:crypto')

async function seedCatalog() {
  const pool = getPool()
  if (!pool) throw new Error('Configure MySQL before seeding.')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    for (const product of products) {
      const categoryId = `category-${product.type}`
      await connection.execute('INSERT IGNORE INTO categories (id, name, slug) VALUES (?, ?, ?)', [categoryId, product.type, product.type])
      await connection.execute('INSERT IGNORE INTO products (id, category_id, name, slug, description, origin, cacao_percentage, type, weight_label, price_cents, is_seasonal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [product.id, categoryId, product.en.name, product.id, product.en.description, product.origin, product.cacao, product.type, product.weight, Math.round(product.price * 100), product.tag === 'seasonal'])
      for (const locale of ['en', 'es']) {
        const text = product[locale]
        await connection.execute('INSERT IGNORE INTO product_translations (id, product_id, locale_code, translated_name, translated_description, translated_region, translated_features) VALUES (?, ?, ?, ?, ?, ?, ?)', [`${product.id}-${locale}`, product.id, locale, text.name, text.description, text.region, JSON.stringify(text.features)])
      }
      await connection.execute('INSERT IGNORE INTO product_images (id, product_id, image_url, alt_text, is_primary) VALUES (?, ?, ?, ?, TRUE)', [`${product.id}-image`, product.id, product.image, product.en.name])
      await connection.execute('INSERT IGNORE INTO inventory (product_id, sku, on_hand, reorder_level) VALUES (?, ?, ?, ?)', [product.id, `SC-${product.id.toUpperCase()}`, product.stock, 3])
    }
    for (const entry of translations) {
      const { namespace, keyName: name } = entry
      const key = createHash('sha256').update(`${namespace}.${name}`).digest('hex').slice(0, 32)
      await connection.execute('INSERT IGNORE INTO translation_keys (id, namespace, key_name) VALUES (?, ?, ?)', [key, namespace, name])
      const [[row]] = await connection.execute('SELECT id FROM translation_keys WHERE namespace = ? AND key_name = ?', [namespace, name])
      for (const locale of ['en', 'es']) await connection.execute('INSERT IGNORE INTO translation_values (id, translation_key_id, locale_code, translated_value) VALUES (?, ?, ?, ?)', [`${key}-${locale}`, row.id, locale, entry[locale]])
    }
    await connection.commit()
    console.log(`Catalog seed complete: ${products.length} products and ${translations.length} bilingual UI keys, images and inventory. Existing rows preserved.`)
  } catch (error) { await connection.rollback(); throw error }
  finally { connection.release(); await pool.end() }
}
seedCatalog().catch(error => { console.error(error.message); process.exitCode = 1 })
