require('../../../db/check').checkDatabase().catch(error => { console.error(error.message); process.exitCode = 1 })
