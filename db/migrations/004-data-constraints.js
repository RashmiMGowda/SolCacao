module.exports = {
  async up(connection) {
    const checks = [
      ['products', 'chk_product_values', 'price_cents >= 0 AND cacao_percentage BETWEEN 0 AND 100'],
      ['inventory', 'chk_inventory_values', 'on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand AND reorder_level >= 0'],
      ['custom_samplers', 'chk_sampler_values', 'box_size > 0 AND base_price_cents >= 0 AND packaging_fee_cents >= 0 AND total_price_cents >= 0'],
      ['custom_sampler_items', 'chk_sampler_quantity', 'quantity > 0'],
      ['cart_items', 'chk_cart_values', 'quantity > 0 AND unit_price_cents >= 0'],
      ['orders', 'chk_order_values', 'subtotal_cents >= 0 AND tax_cents >= 0 AND total_cents >= 0'],
      ['order_items', 'chk_order_item_values', 'quantity > 0 AND unit_price_cents >= 0'],
      ['payments', 'chk_payment_amount', 'amount_cents >= 0'],
      ['b2b_custom_requests', 'chk_b2b_quantity', 'quantity_kg > 0'],
      ['b2b_quotes', 'chk_b2b_quote_amount', 'quoted_amount_cents > 0'],
    ]
    const [rows] = await connection.query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'CHECK'")
    const present = new Set(rows.map(row => row.CONSTRAINT_NAME))
    for (const [table, name, expression] of checks) {
      if (!present.has(name)) await connection.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expression})`)
    }
  },
}
