const { app } = require('./app')
const { env } = require('./config/env')

app.listen(env.port, env.host, () => {
  const repositoryName = env.useMockAuthRepository || !env.hasDatabaseConfig ? 'mock JSON fallback' : 'MySQL'

  console.log(`SolCacao API running on http://${env.host}:${env.port}`)
  console.log(`Auth repository: ${repositoryName}`)
})
