/* eslint-disable react-refresh/only-export-components */
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

function StatusApp() {
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [hasSyncError, setHasSyncError] = useState(false)

  useEffect(() => {
    let active = true
    fetchStatusEntries()
      .then((entries) => {
        if (!active) return
        setStatusEntries(entries)
        setHasSyncError(false)
      })
      .catch(() => {
        if (!active) return
        setHasSyncError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <p className="text-xs font-bold uppercase text-teal-700">
            Expertendashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Aktuelle Themen
          </h1>
        </div>
      </header>
      {hasSyncError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="mx-auto max-w-7xl">
            Die Statusdaten sind derzeit nicht verfügbar.
          </div>
        </div>
      )}
      <StatusPage
        statusEntries={statusEntries}
        intro="Übersicht aller aktuellen Themen."
      />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StatusApp />
  </StrictMode>,
)
