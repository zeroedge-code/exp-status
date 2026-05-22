import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StatusPage } from './statusShared.jsx'
import { createInitialStatusEntries, normalizeStatusEntries } from './statusData.js'

const initialStatusEntries = createInitialStatusEntries()

async function fetchStatusEntries() {
  const response = await fetch('/api/status', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Statusdaten konnten nicht geladen werden.')
  return normalizeStatusEntries(await response.json(), initialStatusEntries)
}

export function StatusApp() {
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetchStatusEntries()
      .then((entries) => {
        if (!active) return
        setStatusEntries(entries)
        setLoadError('')
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error.message)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      {loadError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="mx-auto max-w-7xl">{loadError}</div>
        </div>
      )}
      <StatusPage statusEntries={statusEntries} />
    </div>
  )
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <StatusApp />
    </StrictMode>,
  )
}
