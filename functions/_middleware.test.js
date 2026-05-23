import { expect, test } from 'vitest'
import { onRequest, testExports } from './_middleware.js'

const { getAllowedFrameAncestors, parseAllowedFrameAncestors, withFrameAncestors } =
  testExports

test('parseAllowedFrameAncestors accepts comma and space separated origins', () => {
  expect(
    parseAllowedFrameAncestors(
      'https://admin.example.com, https://backoffice.example.com https://ops.example.com',
    ),
  ).toEqual([
    'https://admin.example.com',
    'https://backoffice.example.com',
    'https://ops.example.com',
  ])
})

test('getAllowedFrameAncestors falls back to the default when blank', () => {
  expect(getAllowedFrameAncestors('')).toBe("'self' https://smartoder.com")
})

test('withFrameAncestors replaces an existing frame-ancestors directive', () => {
  expect(
    withFrameAncestors(
      "default-src 'self'; frame-ancestors 'none'; script-src 'self'",
      ["'self'", 'https://smartoder.com'],
    ),
  ).toBe(
    "default-src 'self'; script-src 'self'; frame-ancestors 'self' https://smartoder.com",
  )
})

test('middleware adds CSP frame-ancestors and removes X-Frame-Options when configured', async () => {
  const response = await onRequest({
    env: { ALLOWED_FRAME_ANCESTORS: "'self' https://smartoder.com" },
    next: async () =>
      new Response('ok', {
        headers: {
          'Content-Type': 'text/plain',
          'X-Frame-Options': 'DENY',
        },
      }),
  })

  expect(response.headers.get('Content-Security-Policy')).toBe(
    "frame-ancestors 'self' https://smartoder.com",
  )
  expect(response.headers.get('X-Frame-Options')).toBeNull()
  expect(await response.text()).toBe('ok')
})

test('middleware uses the configured frame ancestor by default', async () => {
  const response = await onRequest({
    env: {},
    next: async () =>
      new Response('ok', {
        headers: { 'X-Frame-Options': 'DENY' },
      }),
  })

  expect(response.headers.get('Content-Security-Policy')).toBe(
    "frame-ancestors 'self' https://smartoder.com",
  )
  expect(response.headers.get('X-Frame-Options')).toBeNull()
  expect(await response.text()).toBe('ok')
})

test('middleware falls back to the default frame ancestors when the env var is blank', async () => {
  const original = new Response('ok', {
    headers: { 'X-Frame-Options': 'DENY' },
  })
  const response = await onRequest({
    env: { ALLOWED_FRAME_ANCESTORS: '' },
    next: async () => original,
  })

  expect(response.headers.get('Content-Security-Policy')).toBe(
    "frame-ancestors 'self' https://smartoder.com",
  )
  expect(response.headers.get('X-Frame-Options')).toBeNull()
  expect(await response.text()).toBe('ok')
})
