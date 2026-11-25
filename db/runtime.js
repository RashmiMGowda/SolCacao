// Resolve database CLI dependencies from the server's existing installation.
const { createRequire } = require('node:module')
const path = require('node:path')
module.exports = createRequire(path.resolve(__dirname, '../server/package.json'))
