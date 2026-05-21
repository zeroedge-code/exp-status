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

  useEffect(() => {
    let active = true
    fetchStatusEntries()
      .then((entries) => {
        if (!active) return
        setStatusEntries(entries)
      })
      .catch(() => {
        return
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      <StatusPage statusEntries={statusEntries} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StatusApp />
  </StrictMode>,
)
