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

The parent app should open the protected dashboard in a new tab.

## Local Commands

- `npm run build:status`
- `npm run build:admin`
- `npm run build:all`
- `npm run lint`
