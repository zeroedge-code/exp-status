const DEFAULT_FRAME_ANCESTORS = "'self' https://YOUR-PARENT-SITE.com"

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

export async function onRequest({ env, next }) {
  const response = await next()
  const frameAncestors = parseAllowedFrameAncestors(
    env.ALLOWED_FRAME_ANCESTORS ?? DEFAULT_FRAME_ANCESTORS,
  )

  if (frameAncestors.length === 0) return response

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
  parseAllowedFrameAncestors,
  withFrameAncestors,
}
