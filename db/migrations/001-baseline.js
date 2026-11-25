const fs = require('node:fs')
const path = require('node:path')
const schema = fs.readFileSync(path.join(__dirname, '../schema/solcacao_schema.sql'), 'utf8')
module.exports = {
  source: schema,
  async up(connection) {
    try {
      await connection.query(schema.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS '))
    } finally { await connection.query('SET FOREIGN_KEY_CHECKS = 1') }
  },
}
