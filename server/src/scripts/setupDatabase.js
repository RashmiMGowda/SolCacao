// Backward-compatible entry point; shared database tooling lives under db/.
require('../../../db/migrate').migrate().catch(error => { console.error(error.message); process.exitCode = 1 })
