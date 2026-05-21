if (import.meta.env.DEV && !import.meta.env.VITE_APP_TARGET) {
  await import('./main-combined.jsx')
} else if (import.meta.env.VITE_APP_TARGET === 'admin') {
  await import('./main-admin.jsx')
} else {
  await import('./main-status.jsx')
}
