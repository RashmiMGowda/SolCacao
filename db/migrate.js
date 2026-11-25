const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const mysql = require('./runtime')('mysql2/promise')
const { env } = require('../server/src/config/env')

async function migrate() {
  if (!env.hasDatabaseConfig) throw new Error('Set DB_HOST, DB_USER and DB_NAME in server/.env.')
  if (!/^[A-Za-z0-9_]+$/.test(env.db.database)) throw new Error('DB_NAME may contain only letters, numbers and underscores.')
  const connection = await mysql.createConnection({ ...env.db, database: undefined, multipleStatements: true, namedPlaceholders: true })
  let locked = false
  try {
    const [[lock]] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [`${env.db.database}:migrate`])
    if (Number(lock.acquired) !== 1) throw new Error('Another schema migration is running.')
    locked = true
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`)
    await connection.query(`USE \`${env.db.database}\``)
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB')
    for (const name of fs.readdirSync(path.join(__dirname, 'migrations')).filter(name => /^\d+.*\.js$/.test(name)).sort()) {
      const file = path.join(__dirname, 'migrations', name)
      const migration = require(file)
      const script = fs.readFileSync(file, 'utf8')
      const source = migration.source || ''
      // Windows CRLF and Linux LF checkouts must produce identical migration hashes.
      const checksum = createHash('sha256').update(script.replace(/\r\n/g, '\n')).update(source.replace(/\r\n/g, '\n')).digest('hex')
      const legacyChecksum = createHash('sha256').update(script).update(source).digest('hex')
      const [rows] = await connection.execute('SELECT checksum FROM schema_migrations WHERE name = ?', [name])
      if (rows.length) {
        if (rows[0].checksum !== checksum) {
          if (rows[0].checksum !== legacyChecksum) throw new Error(`Applied migration ${name} changed. Restore it and add a new migration instead.`)
          await connection.execute('UPDATE schema_migrations SET checksum = ? WHERE name = ?', [checksum, name])
        }
        continue
      }
      await migration.up(connection)
      await connection.execute('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)', [name, checksum])
      console.log(`Applied ${name}`)
    }
    console.log('Database migrations are current. Existing data preserved.')
  } finally {
    if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [`${env.db.database}:migrate`])
    await connection.end()
  }
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { migrate }
