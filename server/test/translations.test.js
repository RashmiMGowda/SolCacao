const { test } = require('node:test')
const assert = require('node:assert/strict')

const fsSync = require('node:fs')
const osSync = require('node:os')
const pathSync = require('node:path')

// Every test in this file uses a throw-away users file, never the project's server/data/users.json.
const testDirectory = fsSync.mkdtempSync(pathSync.join(osSync.tmpdir(), 'solcacao-translations-test-'))
process.env.AUTH_DATA_PATH = pathSync.join(testDirectory, 'users.json')
fsSync.writeFileSync(process.env.AUTH_DATA_PATH, '[]')
process.env.USE_MOCK_AUTH_REPOSITORY = 'true'
process.env.NODE_ENV = 'test'
process.env.BCRYPT_ROUNDS = '4'
process.on('exit', () => fsSync.rmSync(testDirectory, { recursive: true, force: true }))

const { buildBundle } = require('../src/modules/localization/translationRepository')

test('buildBundle nests dotted keys, maps ui text by its English source and skips unsafe keys', () => {
  const { messages, ui } = buildBundle([
    { namespace: 'nav', keyName: 'home', value: 'Inicio', source: 'Home' },
    { namespace: 'b2b', keyName: 'services.title', value: 'Titulo', source: 'Title' },
    { namespace: 'ui', keyName: 'abc123', value: 'Comprar ahora', source: 'Shop now' },
    { namespace: '__proto__', keyName: 'polluted', value: 'x', source: 'x' },
    { namespace: 'nav', keyName: 'constructor.prototype.bad', value: 'x', source: 'x' },
  ])
  assert.equal(messages.nav.home, 'Inicio')
  assert.equal(messages.b2b.services.title, 'Titulo')
  assert.equal(ui['Shop now'], 'Comprar ahora')
  assert.equal({}.polluted, undefined)
  assert.equal(messages.nav.constructor, Object)
})

test('translations API serves English and Spanish dictionaries', async t => {
  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const api = `http://127.0.0.1:${server.address().port}/api/translations`

  const index = await (await fetch(api)).json()
  assert.deepEqual(index.locales, ['en', 'es'])
  assert.equal(index.defaultLocale, 'en')

  const esResponse = await fetch(`${api}/es`)
  assert.equal(esResponse.status, 200)
  assert.match(esResponse.headers.get('cache-control'), /max-age=300/)
  const es = await esResponse.json()
  assert.equal(es.locale, 'es')
  assert.equal(es.messages.nav.home, 'Inicio')
  assert.equal(es.messages.catalog.cart, 'Carrito')
  assert.equal(es.ui['Shop now'], 'Comprar ahora')
  assert.ok(es.count > 400)

  const en = await (await fetch(`${api}/en`)).json()
  assert.equal(en.messages.nav.home, 'Home')
  assert.equal(en.messages.catalog.cart, 'Cart')
  assert.equal(en.ui['Shop now'], 'Shop now')
})

test('translations API can return one namespace and rejects bad input', async t => {
  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const api = `http://127.0.0.1:${server.address().port}/api/translations`

  const nav = await (await fetch(`${api}/es?namespace=nav`)).json()
  assert.deepEqual(Object.keys(nav.messages), ['nav'])
  assert.equal(nav.count, 11)
  assert.deepEqual(nav.ui, {})

  assert.equal((await fetch(`${api}/fr`)).status, 400)
  assert.equal((await fetch(`${api}/es?namespace=bad%20name!`)).status, 400)
  assert.equal((await fetch(`${api}/es?namespace=nothing`)).status, 404)
})

test('language preference: saved per signed-in user and requires a token', async t => {
  const { app } = require('../src/app')
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const api = `http://127.0.0.1:${server.address().port}/api`
  const send = (url, method, body, token) => fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })

  assert.equal((await send(`${api}/translations/preference`, 'GET')).status, 401)
  assert.equal((await send(`${api}/translations/preference`, 'PUT', { locale: 'es' })).status, 401)

  const login = await send(`${api}/auth/login`, 'POST', { email: 'customer@solcacao.test', password: 'Password123!' })
  assert.equal(login.status, 200)
  const { token } = await login.json()

  assert.deepEqual(await (await send(`${api}/translations/preference`, 'GET', null, token)).json(), { locale: 'en' })
  const saved = await send(`${api}/translations/preference`, 'PUT', { locale: 'es' }, token)
  assert.equal(saved.status, 200)
  assert.deepEqual(await saved.json(), { locale: 'es' })
  assert.deepEqual(await (await send(`${api}/translations/preference`, 'GET', null, token)).json(), { locale: 'es' })

  // The saved language is also visible on the profile the rest of the app reads.
  const me = await (await send(`${api}/auth/me`, 'GET', null, token)).json()
  assert.equal(me.user.preferredLanguage, 'es')
  assert.equal(me.user.firstName, 'Alex')

  assert.equal((await send(`${api}/translations/preference`, 'PUT', { locale: 'fr' }, token)).status, 400)
  assert.equal((await send(`${api}/translations/preference`, 'PUT', {}, token)).status, 400)
  // "preference" must not be mistaken for a language code by the public route.
  assert.equal((await fetch(`${api}/translations/es`)).status, 200)
})
