module.exports = {
  async up(connection) {
    const indexes = [
      ['products', 'idx_products_catalog_filters', '(is_active, origin, cacao_percentage, price_cents)'],
      ['carts', 'idx_carts_user_active', '(user_id, status, updated_at)'],
      ['carts', 'idx_carts_session_active', '(session_id, status, updated_at)'],
      ['cart_items', 'idx_cart_items_product_lines', '(cart_id, item_type, product_id)'],
    ]
    const [rows] = await connection.execute(
      `SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()`,
    )
    const present = new Set(rows.map(row => `${row.TABLE_NAME}.${row.INDEX_NAME}`))
    for (const [table, name, columns] of indexes) {
      if (!present.has(`${table}.${name}`)) await connection.query(`CREATE INDEX ${name} ON ${table} ${columns}`)
    }
  },
}
