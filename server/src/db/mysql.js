const mysql = require('mysql2/promise')
const { env } = require('../config/env')

let pool = null

function getPool() {
  if (!env.hasDatabaseConfig) return null

  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    })
  }

  return pool
}

async function query(sql, params = {}) {
  const activePool = getPool()

  if (!activePool) {
    throw new Error('MySQL is not configured. Add DB_HOST, DB_USER, and DB_NAME to .env.')
  }

  const [rows] = await activePool.execute(sql, params)
  return rows
}

async function transaction(work) {
  const activePool = getPool()

  if (!activePool) {
    throw new Error('MySQL is not configured. Add DB_HOST, DB_USER, and DB_NAME to .env.')
  }

  const connection = await activePool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { getPool, query, transaction }
