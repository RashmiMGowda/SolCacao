import { expect, test } from 'vitest'
import { socialLinks } from './socialLinks'

test('WhatsApp shares a prefilled message without exposing a destination phone number', () => {
  const link = new URL(socialLinks.whatsapp.url)
  expect(link.origin).toBe('https://wa.me')
  expect(link.pathname).toBe('/')
  expect(link.searchParams.get('text')).toBe('Hello SolCacao, I have a question.')
  expect(link.searchParams.has('phone')).toBe(false)
  expect(socialLinks.whatsapp.label).toBe('Share on WhatsApp')
})
