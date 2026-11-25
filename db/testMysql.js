const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync(process.execPath, ['--test', 'test/mysql.integration.test.js'], { cwd: path.resolve(__dirname, '../server'), env: { ...process.env, MYSQL_INTEGRATION: 'true' }, stdio: 'inherit' })
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
