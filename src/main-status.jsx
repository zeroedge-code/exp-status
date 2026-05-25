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

async function fetchStatusData(useMockData = false) {
  if (useMockData) {
    const { mockStatusData } = await import('./statusMockData.js')
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

export function StatusApp() {
  const [useMockData, setUseMockData] = useState(() => shouldUseMockStatusData())
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [settings, setSettings] = useState(defaultDisplaySettings)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchStatusData(useMockData)
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
  }, [useMockData])

  function toggleMockData(enabled) {
    setLoading(true)
    setUseMockData(enabled)
    updateMockQuery(enabled)
  }

  return (
    <div className="min-h-screen">
      {shouldShowMockToggle() && (
        <MockDataToggle enabled={useMockData} onChange={toggleMockData} />
      )}
      {loadError && (
        <div className="border-b border-[var(--danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger-text)]">
          <div className="mx-auto max-w-2xl">{loadError}</div>
        </div>
      )}
      <StatusPage statusEntries={statusEntries} settings={settings} loading={loading} />
    </div>
  )
}

function shouldShowMockToggle() {
  const params = new URLSearchParams(window.location.search)
  return params.has('mockToggle') || params.has('mock')
}

function shouldUseMockStatusData() {
  const params = new URLSearchParams(window.location.search)
  return params.get('mock') === '1' || params.get('mock') === 'true'
}

function updateMockQuery(enabled) {
  const url = new URL(window.location.href)
  url.searchParams.set('mockToggle', '1')
  if (enabled) {
    url.searchParams.set('mock', '1')
  } else {
    url.searchParams.delete('mock')
  }
  window.history.replaceState({}, '', url)
}

function MockDataToggle({ enabled, onChange }) {
  return (
    <div className="mock-toggle-bar">
      <div className="mock-toggle-inner">
        <span>Demo-Daten</span>
        <div className="mock-toggle-actions" aria-label="Datenquelle">
          <button
            type="button"
            aria-pressed={!enabled}
            className={!enabled ? 'mock-toggle-active' : ''}
            onClick={() => onChange(false)}
          >
            Live
          </button>
          <button
            type="button"
            aria-pressed={enabled}
            className={enabled ? 'mock-toggle-active' : ''}
            onClick={() => onChange(true)}
          >
            Demo
          </button>
        </div>
      </div>
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
