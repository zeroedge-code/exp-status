if (import.meta.env.VITE_APP_TARGET === 'admin') {
  await import('./main-admin.jsx')
} else {
  await import('./main-status.jsx')
}
