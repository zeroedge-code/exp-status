# Expertenstatus

React/Vite app for the expert status view and the protected internal admin dashboard.

## Cloudflare Pages

Use two Pages projects from the same repository:

- `exp-status`: expert status view
  - Build command: `npm run build:status`
  - Output directory: `dist-status`
  - Environment variable: `APP_TARGET=status`
  - KV binding: `STATUS_STORE`
- `exp-status-admin`: internal admin dashboard
  - Build command: `npm run build:admin`
  - Output directory: `dist-admin`
  - Environment variable: `APP_TARGET=admin`
  - KV binding: `STATUS_STORE`

Both projects must use the same KV namespace for `STATUS_STORE`. The status project can read the central data. Only the admin project can write changes because `/api/status` rejects writes unless `APP_TARGET=admin`.

Cloudflare Access should protect `exp-status` for experts and admin users, and `exp-status-admin` for the admin email only.

## Iframe Embedding

The Cloudflare Pages Function sends this HTTP header by default so the status
app can be embedded by the parent site:

- `Content-Security-Policy: frame-ancestors 'self' https://YOUR-PARENT-SITE.com`

It also removes `X-Frame-Options` from those responses, because `DENY` or
`SAMEORIGIN` would block the iframe even when CSP allows it.

To override the default, set this Cloudflare Pages environment variable on the
app that should be embedded:

- `ALLOWED_FRAME_ANCESTORS='self' https://YOUR-PARENT-SITE.com`

Multiple origins can be separated by spaces or commas.

The Rails app may also need to allow this app URL in its own CSP, typically via
`frame-src` or `child-src`.

## Local Commands

- `npm run build:status`
- `npm run build:admin`
- `npm run build:all`
- `npm run lint`
