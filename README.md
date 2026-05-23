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

Requests to the default Pages domains are redirected to the custom domains:

- `https://exp-status.pages.dev` -> `https://expertiger.zeroedge.tech`
- `https://exp-status-admin.pages.dev` -> `https://admin.zeroedge.tech`

Keep Cloudflare Access protection on the custom domains. This prevents the
default Pages hostnames from becoming a public bypass when the parent app embeds
the custom domains.

## Iframe Embedding

The Cloudflare Pages Function sends this HTTP header by default so the status
app can be embedded by smartoder.com:

- `Content-Security-Policy: frame-ancestors 'self' https://smartoder.com`

It also removes `X-Frame-Options` from those responses, because `DENY` or
`SAMEORIGIN` would block the iframe even when CSP allows it.

To override the default, set this Cloudflare Pages environment variable on the
app that should be embedded:

- `ALLOWED_FRAME_ANCESTORS='self' https://smartoder.com`

Multiple origins can be separated by spaces or commas.

The Rails app may also need to allow this app URL in its own CSP, typically via
`frame-src` or `child-src`.

Use the custom domains as iframe sources in `smartoder.com`:

- Status iframe: `https://expertiger.zeroedge.tech`
- Admin iframe: `https://admin.zeroedge.tech`

Do not use the `.pages.dev` domains as iframe sources. Cloudflare Access login
pages cannot render inside an iframe because Cloudflare sends headers such as
`frame-ancestors 'none'` and `X-Frame-Options: DENY` on the login flow. The
parent app should open the protected custom domain in a new tab, then reload the
iframe when the user returns:

```jsx
const statusIframeUrl = 'https://expertiger.zeroedge.tech'

function EmbeddedStatus() {
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    function reloadAfterExternalLogin() {
      if (!document.hidden) setIframeKey((key) => key + 1)
    }

    window.addEventListener('focus', reloadAfterExternalLogin)
    document.addEventListener('visibilitychange', reloadAfterExternalLogin)
    return () => {
      window.removeEventListener('focus', reloadAfterExternalLogin)
      document.removeEventListener('visibilitychange', reloadAfterExternalLogin)
    }
  }, [])

  return (
    <>
      <a href={statusIframeUrl} target="_blank" rel="noreferrer">
        Login / Open Dashboard
      </a>
      <iframe
        key={iframeKey}
        src={statusIframeUrl}
        title="Expertiger status"
      />
    </>
  )
}
```

## Local Commands

- `npm run build:status`
- `npm run build:admin`
- `npm run build:all`
- `npm run lint`
