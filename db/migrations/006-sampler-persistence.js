module.exports = {
  async up(connection) {
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_samplers'`,
    )
    const names = new Set(columns.map(column => column.COLUMN_NAME))
    if (!names.has('session_id')) {
      await connection.query("ALTER TABLE custom_samplers ADD COLUMN session_id VARCHAR(64) NOT NULL DEFAULT '' AFTER id")
    }
    if (!names.has('selections')) {
      await connection.query("ALTER TABLE custom_samplers ADD COLUMN selections JSON NULL AFTER packaging_type")
      await connection.query("UPDATE custom_samplers SET selections = JSON_ARRAY() WHERE selections IS NULL")
      await connection.query('ALTER TABLE custom_samplers MODIFY COLUMN selections JSON NOT NULL')
    }
    const [indexes] = await connection.execute(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_samplers' AND INDEX_NAME = 'idx_custom_samplers_session_created'`,
    )
    if (!indexes.length) {
      await connection.query('CREATE INDEX idx_custom_samplers_session_created ON custom_samplers (session_id, created_at)')
    }
  },
}
