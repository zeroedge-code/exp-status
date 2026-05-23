const DEFAULT_FRAME_ANCESTORS = "'self' https://smartoder.com"
const CANONICAL_HOSTS = {
  'exp-status.pages.dev': 'expertiger.zeroedge.tech',
  'exp-status-admin.pages.dev': 'admin.zeroedge.tech',
}

function getCanonicalRedirectUrl(request) {
  if (!request?.url) return null

  const url = new URL(request.url)
  const canonicalHost = CANONICAL_HOSTS[url.hostname]
  if (!canonicalHost) return null

  url.protocol = 'https:'
  url.hostname = canonicalHost
  return url.toString()
}

function getAllowedFrameAncestors(value) {
  if (typeof value !== 'string') return DEFAULT_FRAME_ANCESTORS

  const trimmed = value.trim()
  return trimmed === '' ? DEFAULT_FRAME_ANCESTORS : trimmed
}

function parseAllowedFrameAncestors(value) {
  if (typeof value !== 'string') return []
  return value
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function withFrameAncestors(contentSecurityPolicy, frameAncestors) {
  const directive = `frame-ancestors ${frameAncestors.join(' ')}`
  if (!contentSecurityPolicy) return directive

  const directives = contentSecurityPolicy
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  const nextDirectives = directives.filter(
    (part) => !part.toLowerCase().startsWith('frame-ancestors '),
  )
  nextDirectives.push(directive)

  return nextDirectives.join('; ')
}

export async function onRequest({ request, env, next }) {
  const canonicalUrl = getCanonicalRedirectUrl(request)
  if (canonicalUrl) {
    return new Response(null, {
      status: 308,
      headers: {
        Location: canonicalUrl,
        'Cache-Control': 'no-store',
      },
    })
  }

  const response = await next()
  const frameAncestors = parseAllowedFrameAncestors(
    getAllowedFrameAncestors(env.ALLOWED_FRAME_ANCESTORS),
  )

  const headers = new Headers(response.headers)
  headers.delete('X-Frame-Options')
  headers.set(
    'Content-Security-Policy',
    withFrameAncestors(headers.get('Content-Security-Policy'), frameAncestors),
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const testExports = {
  getCanonicalRedirectUrl,
  getAllowedFrameAncestors,
  parseAllowedFrameAncestors,
  withFrameAncestors,
}
