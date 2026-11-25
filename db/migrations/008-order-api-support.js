module.exports = {
  async up(connection) {
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
    )
    const names = new Set(columns.map(column => column.COLUMN_NAME))
    if (!names.has('guest_token_hash')) {
      await connection.query('ALTER TABLE orders ADD COLUMN guest_token_hash CHAR(64) NULL AFTER user_id')
    }

    const [indexes] = await connection.execute(
      `SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()`,
    )
    const present = new Set(indexes.map(row => `${row.TABLE_NAME}.${row.INDEX_NAME}`))
    const additions = [
      ['orders', 'idx_orders_user_created', '(user_id, created_at)', false],
      ['orders', 'uk_orders_guest_token_hash', '(guest_token_hash)', true],
      ['order_items', 'idx_order_items_order', '(order_id)', false],
    ]
    for (const [table, name, columns, unique] of additions) {
      if (!present.has(`${table}.${name}`)) await connection.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${name} ON ${table} ${columns}`)
    }
  },
}
