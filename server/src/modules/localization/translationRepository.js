const path = require('node:path')
const { env } = require('../../config/env')
const { query } = require('../../db/mysql')

const seedEntries = require(path.resolve(__dirname, '../../../../db/seed/localization.json'))
const useJson = env.useMockAuthRepository || !env.hasDatabaseConfig

const LOCALES = ['en', 'es']
const DEFAULT_LOCALE = 'en'
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

// Turns flat rows ({ namespace, keyName, value, source }) into the shape the React app already uses:
//   messages.nav.home        <- namespace "nav", key "home"
//   messages.b2b.services.title <- namespace "b2b", key "services.title"
//   ui["English sentence"]   <- namespace "ui" (key is a hash; the English text is the lookup key)
function buildBundle(rows) {
  const messages = {}
  const ui = {}

  for (const { namespace, keyName, value, source } of rows) {
    if (namespace === 'ui') {
      if (source) ui[source] = value
      continue
    }
    const parts = [namespace, ...String(keyName).split('.')]
    if (parts.some(part => !part || UNSAFE_KEYS.has(part))) continue

    let node = messages
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {}
      node = node[part]
    }
    const leaf = parts[parts.length - 1]
    if (typeof node[leaf] !== 'object') node[leaf] = value
  }

  return { messages, ui }
}

function listJson(locale) {
  return seedEntries.map(entry => ({
    namespace: entry.namespace,
    keyName: entry.keyName,
    value: entry[locale],
    source: entry.en,
  }))
}

async function listMysql(locale) {
  return query(
    `SELECT k.namespace AS namespace, k.key_name AS keyName,
            v.translated_value AS value, en.translated_value AS source
       FROM translation_keys k
       JOIN translation_values v ON v.translation_key_id = k.id AND v.locale_code = :locale
       LEFT JOIN translation_values en ON en.translation_key_id = k.id AND en.locale_code = 'en'
      ORDER BY k.namespace ASC, k.key_name ASC`,
    { locale },
  )
}

async function getBundle(locale, namespace = null) {
  const rows = await (useJson ? listJson(locale) : listMysql(locale))
  const filtered = namespace ? rows.filter(row => row.namespace === namespace) : rows
  return { ...buildBundle(filtered), count: filtered.length }
}

module.exports = { LOCALES, DEFAULT_LOCALE, buildBundle, getBundle }
