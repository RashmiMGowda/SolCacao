// Development fixtures only: no real payments, messages or password-reset tokens.
const { getPool } = require('../server/src/db/mysql')
async function seedWorkflows() {
  const pool = getPool()
  if (!pool) throw new Error('Configure MySQL before seeding.')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[customer]] = await connection.execute("SELECT id FROM users WHERE email = 'customer@solcacao.test'")
    const [[admin]] = await connection.execute("SELECT id FROM users WHERE email = 'admin@solcacao.test'")
    const [[partner]] = await connection.execute("SELECT cp.id FROM corporate_partners cp JOIN users u ON u.id = cp.user_id WHERE u.email = 'business@solcacao.test'")
    if (!customer || !admin || !partner) throw new Error('Run the auth seed first.')
    const insert = (table, values) => {
      const columns = Object.keys(values)
      return connection.execute(`INSERT IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, Object.values(values))
    }
    await insert('custom_samplers', { id: 'fixture-sampler', session_id: '00000000-0000-4000-8000-000000000017', box_size: 6, packaging_type: 'Classic Box', selections: JSON.stringify([{ name: '70% Dark Cacao', quantity: 6 }]), gift_message: 'Demo gift', base_price_cents: 1800, packaging_fee_cents: 0, total_price_cents: 1800 })
    await insert('custom_sampler_items', { custom_sampler_id: 'fixture-sampler', product_id: 'madagascar-55', quantity: 6 })
    await insert('carts', { id: 'fixture-cart', user_id: customer.id, status: 'ACTIVE' })
    await insert('cart_items', { id: 'fixture-cart-product', cart_id: 'fixture-cart', item_type: 'PRODUCT', product_id: 'madagascar-55', quantity: 1, unit_price_cents: 1200 })
    await insert('cart_items', { id: 'fixture-cart-sampler', cart_id: 'fixture-cart', item_type: 'SAMPLER', custom_sampler_id: 'fixture-sampler', quantity: 1, unit_price_cents: 1800 })
    await insert('orders', { id: 'fixture-order', order_number: 'SC-DEMO-001', user_id: customer.id, checkout_email: 'customer@solcacao.test', status: 'PAID', subtotal_cents: 1200, tax_cents: 99, total_cents: 1299 })
    await insert('order_items', { id: 'fixture-order-item', order_id: 'fixture-order', item_type: 'PRODUCT', product_id: 'madagascar-55', product_name_snapshot: 'Madagascar 55% Dark', quantity: 1, unit_price_cents: 1200 })
    await insert('order_addresses', { id: 'fixture-order-address', order_id: 'fixture-order', first_name: 'Demo', last_name: 'Customer', street: '123 Cocoa Lane', city: 'Arlington', state: 'TX', postal_code: '76010', country: 'United States' })
    await insert('payments', { id: 'fixture-payment', order_id: 'fixture-order', transaction_ref: 'DEMO-NOT-A-REAL-PAYMENT', amount_cents: 1299, payment_method: 'DEMO', payment_status: 'COMPLETED' })
    await insert('order_status_history', { id: 'fixture-order-status', order_id: 'fixture-order', status: 'PAID', notes: 'Seeded demonstration order; no payment processed.', changed_by: admin.id })
    await insert('shipments', { id: 'fixture-shipment', order_id: 'fixture-order', carrier: 'Demo carrier' })
    await insert('b2b_custom_requests', { id: '00000000-0000-4000-8000-000000000001', corporate_partner_id: partner.id, cacao_profile: 'Dark 70%', quantity_kg: 25, brand_campaign_name: 'Demo Corporate Gifts', packaging_type: 'gift-box', status: 'QUOTED' })
    await insert('b2b_request_status_history', { id: 'fixture-request-history', b2b_request_id: '00000000-0000-4000-8000-000000000001', status: 'QUOTED', notes: 'Seeded demonstration quote.', changed_by: admin.id })
    await insert('b2b_quotes', { id: 'fixture-quote', b2b_request_id: '00000000-0000-4000-8000-000000000001', quote_number: 'SC-DEMO-QUOTE-001', quoted_amount_cents: 85000, valid_until: new Date('2030-01-01T00:00:00Z'), created_by: admin.id, status: 'SENT' })
    await insert('inquiries', { id: 'fixture-contact', user_id: customer.id, name: 'Demo Customer', email: 'customer@solcacao.test', category: 'CONTACT', subject: 'Gift availability', message: 'Example inquiry for API development.' })
    await insert('inquiries', { id: 'fixture-feedback', name: 'Demo Guest', email: 'guest@solcacao.test', category: 'FEEDBACK', subject: 'Demo feedback', message: 'Example feedback for API development.', rating: 5 })
    await connection.commit()
    console.log('Demo carts, sampler, order, payment, shipment, B2B quote and inquiries seeded; existing records preserved.')
  } catch (error) { await connection.rollback(); throw error }
  finally { connection.release(); await pool.end() }
}
seedWorkflows().catch(error => { console.error(error.message); process.exitCode = 1 })
