const { env } = require('../../config/env')

const shouldUseMockRepository = env.useMockAuthRepository || !env.hasDatabaseConfig

const repository = shouldUseMockRepository
  ? require('./mockUserRepository')
  : require('./mysqlUserRepository')

module.exports = repository
