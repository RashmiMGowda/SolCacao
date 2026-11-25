import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, VITE_AUTH_MODE: 'api', VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api' },
})
child.on('exit', code => { process.exitCode = code ?? 1 })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
