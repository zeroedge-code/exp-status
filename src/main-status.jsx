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
  if (shouldUseMockStatusData()) {
    const { mockStatusData } = await import(/* @vite-ignore */ './statusMockData.js')
    return {
      statusEntries: normalizeStatusEntries(mockStatusData, initialStatusEntries),
      settings: normalizeDisplaySettings(mockStatusData),
    }
  }

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

function shouldUseMockStatusData() {
  return (
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    new URLSearchParams(window.location.search).has('mock')
  )
}

export function StatusApp() {
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [settings, setSettings] = useState(defaultDisplaySettings)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchStatusData()
      .then((data) => {
        if (!active) return
        setStatusEntries(data.statusEntries)
        setSettings(data.settings)
        setLoadError('')
        setLoading(false)
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      {loadError && (
        <div className="border-b border-[var(--danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger-text)]">
          <div className="mx-auto max-w-2xl">{loadError}</div>
        </div>
      )}
      <StatusPage statusEntries={statusEntries} settings={settings} loading={loading} />
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
