module.exports = {
  async up(connection) {
    const columns = { reviewed_at: 'DATETIME NULL', rejection_reason: 'TEXT NULL' }
    const [rows] = await connection.query('SHOW COLUMNS FROM corporate_partners')
    const present = new Set(rows.map(row => row.Field))
    for (const [name, definition] of Object.entries(columns)) {
      if (!present.has(name)) await connection.query(`ALTER TABLE corporate_partners ADD COLUMN ${name} ${definition}`)
    }
  },
}
