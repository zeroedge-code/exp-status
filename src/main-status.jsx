import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import useSWR, { SWRConfig } from 'swr'
import './index.css'
import { StatusPage } from './statusShared.jsx'
import {
  createInitialStatusEntries,
  defaultDisplaySettings,
  normalizeDisplaySettings,
  normalizeStatusEntries,
} from './statusData.js'

const initialStatusEntries = createInitialStatusEntries()

async function fetchStatusData(useMockData) {
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

function StatusAppInner() {
  const [useMockData, setUseMockData] = useState(() => shouldUseMockStatusData())

  const { data, error, isLoading } = useSWR(
    ['status', useMockData],
    ([, mock]) => fetchStatusData(mock),
    { revalidateOnFocus: true, refreshInterval: 30000, dedupingInterval: 10000 },
  )

  const statusEntries = data?.statusEntries ?? initialStatusEntries
  const settings = data?.settings ?? defaultDisplaySettings
  const loadError = error?.message ?? ''

  function toggleMockData(enabled) {
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
      <StatusPage statusEntries={statusEntries} settings={settings} loading={isLoading} />
    </div>
  )
}

export function StatusApp() {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      <StatusAppInner />
    </SWRConfig>
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
