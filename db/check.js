const fs = require('node:fs')
const path = require('node:path')
const { getPool } = require('../server/src/db/mysql')

async function checkDatabase() {
  const pool = getPool()
  if (!pool) throw new Error('MySQL is not configured.')
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema/solcacao_schema.sql'), 'utf8')
    const tables = [...schema.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\) ENGINE=InnoDB;/g)]
    for (const [, table, body] of tables) {
      const expected = [...body.matchAll(/^  (\w+)\s+(?:CHAR|VARCHAR|TEXT|INT|BIGINT|BOOLEAN|DATETIME|ENUM)\b/gm)].map(match => match[1])
      const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``)
      const actual = new Set(rows.map(row => row.Field))
      const missing = expected.filter(column => !actual.has(column))
      if (missing.length) throw new Error(`${table} missing columns: ${missing.join(', ')}`)
      const expectedConstraints = [...body.matchAll(/CONSTRAINT (\w+) (?:FOREIGN KEY|CHECK)/g)].map(match => match[1])
      const [constraints] = await pool.query('SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table])
      const actualConstraints = new Set(constraints.map(row => row.CONSTRAINT_NAME))
      const absentConstraints = expectedConstraints.filter(name => !actualConstraints.has(name))
      if (absentConstraints.length) throw new Error(`${table} missing constraints: ${absentConstraints.join(', ')}`)
    }
    const [migrations] = await pool.query('SELECT name FROM schema_migrations ORDER BY name')
    await pool.query('SELECT auth_version FROM users LIMIT 0')
    console.log(`Verified all ${tables.length} application tables, columns and baseline relationships/constraints; ${migrations.length} migrations applied.`)
    const [[counts]] = await pool.query('SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM inventory) AS inventory, (SELECT COUNT(*) FROM translation_values) AS translations')
    console.log(counts)
  } finally { await pool.end() }
}
if (require.main === module) checkDatabase().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { checkDatabase }
