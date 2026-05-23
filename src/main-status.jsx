import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StatusPage } from './statusShared.jsx'
import {
  createInitialStatusEntries,
  defaultDisplaySettings,
  normalizeDisplaySettings,
  normalizeStatusEntries,
} from './statusData.js'

const initialStatusEntries = createInitialStatusEntries()

async function fetchStatusData() {
  const response = await fetch('/api/status', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Statusdaten konnten nicht geladen werden.')
  const payload = await response.json()
  return {
    statusEntries: normalizeStatusEntries(payload, initialStatusEntries),
    settings: normalizeDisplaySettings(payload),
  }
}

export function StatusApp() {
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [settings, setSettings] = useState(defaultDisplaySettings)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetchStatusData()
      .then((data) => {
        if (!active) return
        setStatusEntries(data.statusEntries)
        setSettings(data.settings)
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
      <StatusPage statusEntries={statusEntries} settings={settings} />
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
