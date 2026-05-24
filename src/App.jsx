import { useEffect, useRef, useState } from 'react'
import { AdminRow } from './components/AdminRow.jsx'
import { Button } from './components/Button.jsx'
import { StatusPage } from './statusShared.jsx'
import {
  createInitialStatusEntries,
  defaultDisplaySettings,
  normalizeDisplaySettings,
  normalizeStatusEntries,
} from './statusData.js'

const today = new Date().toISOString().slice(0, 10)

const emptyStatusEntry = {
  category: 'Auszahlungen & Vergütung',
  title: '',
  status: 'Neu',
  owner: 'Operator',
  type: 'info',
  priority: '',
  showProgress: false,
  createdAt: today,
  updatedAt: today,
  dueDate: today,
  description: '',
}

const initialData = {
  statusEntries: createInitialStatusEntries(),
  settings: defaultDisplaySettings,
  tasks: [],
}

const localDevStorageKey = 'expertenstatus-local-dev-data'
const useLocalDevStore =
  import.meta.env.DEV && import.meta.env.MODE !== 'test' && !import.meta.env.VITE_APP_TARGET

function normalizeData(rawData) {
  return {
    statusEntries: normalizeStatusEntries(rawData, initialData.statusEntries),
    settings: normalizeDisplaySettings(rawData),
    tasks: Array.isArray(rawData?.tasks)
      ? rawData.tasks.map((task) => ({
          ...task,
          completed: Boolean(task.completed),
        }))
      : initialData.tasks,
  }
}

async function fetchData() {
  if (useLocalDevStore) {
    const stored = window.localStorage.getItem(localDevStorageKey)
    return stored ? normalizeData(JSON.parse(stored)) : initialData
  }

  const response = await fetch('/api/status', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Statusdaten konnten nicht geladen werden.')
  return normalizeData(await response.json())
}

async function saveData(nextData) {
  if (useLocalDevStore) {
    const normalizedData = normalizeData(nextData)
    window.localStorage.setItem(localDevStorageKey, JSON.stringify(normalizedData))
    return normalizedData
  }

  const response = await fetch('/api/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizeData(nextData)),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? ` ${payload.details.join(' ')}` : ''
    throw new Error(
      payload?.error
        ? `${payload.error}${details}`
        : 'Statusdaten konnten nicht gespeichert werden.',
    )
  }
  return normalizeData(payload)
}

function App({ adminOnly = false }) {
  const [data, setData] = useState(initialData)
  const [syncState, setSyncState] = useState('loading')
  const [syncError, setSyncError] = useState('')
  const [path, setPath] = useState(adminOnly ? '/intern' : window.location.pathname)
  const saveRequestId = useRef(0)

  useEffect(() => {
    document.title = adminOnly || path === '/intern' ? 'Expertenstatus Admin' : 'Expertenstatus'
  }, [adminOnly, path])

  useEffect(() => {
    let active = true
    fetchData()
      .then((remoteData) => {
        if (!active) return
        setData(remoteData)
        setSyncError('')
        setSyncState('ready')
      })
      .catch((error) => {
        if (!active) return
        setSyncError(error.message)
        setSyncState('error')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onPopState = () => setPath(adminOnly ? '/intern' : window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [adminOnly])

  function navigate(nextPath) {
    if (adminOnly) return
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  async function updateData(nextData) {
    const requestId = saveRequestId.current + 1
    saveRequestId.current = requestId
    const previousData = data
    const normalizedData = normalizeData(nextData)
    setData(normalizedData)
    setSyncError('')
    setSyncState('saving')
    try {
      const savedData = await saveData(normalizedData)
      if (requestId !== saveRequestId.current) return
      setData(savedData)
      setSyncError('')
      setSyncState('saved')
      return true
    } catch (error) {
      if (requestId !== saveRequestId.current) return
      setData(previousData)
      setSyncError(error.message)
      setSyncState('error')
      return false
    }
  }

  const isIntern = adminOnly || path === '/intern'

  return (
    <div className="min-h-screen">
      <SyncBanner syncState={syncState} syncError={syncError} adminOnly={adminOnly} />
      {isIntern ? (
        <AdminDashboard
          data={data}
          updateData={updateData}
          syncError={syncError}
          onOpenStatus={adminOnly ? null : () => navigate('/status')}
        />
      ) : (
        <StatusPage
          statusEntries={data.statusEntries}
          settings={data.settings}
          loading={syncState === 'loading'}
        />
      )}
    </div>
  )
}

function SyncBanner({ syncState, syncError, adminOnly }) {
  if (syncState === 'ready' || syncState === 'saved') return null
  if (!adminOnly && syncState !== 'error') return null

  const message =
    syncState === 'error'
      ? syncError || 'Zentrale Speicherung ist nicht erreichbar. Bitte Cloudflare KV-Binding prüfen.'
      : syncState === 'saving'
        ? 'Änderungen werden zentral gespeichert.'
        : 'Zentrale Statusdaten werden geladen.'

  return (
    <div
      className={`border-b px-4 py-3 text-sm ${
        syncState === 'error'
          ? 'border-[var(--danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]'
          : 'border-[var(--accent)] bg-[var(--color-accent-soft)] text-[var(--accent-hover)]'
      }`}
    >
      <div className="mx-auto max-w-7xl">{message}</div>
    </div>
  )
}

function AdminDashboard({ data, updateData, syncError, onOpenStatus }) {
  const [newEntry, setNewEntry] = useState(null)
  const [rowFlash, setRowFlash] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const [activePanel, setActivePanel] = useState('entries')

  function setStatusEntries(statusEntries) {
    return updateData({ ...data, statusEntries })
  }

  function setSettings(settings) {
    return updateData({ ...data, settings })
  }

  async function saveEntry(nextEntry) {
    const isNew = !data.statusEntries.some((entry) => entry.id === nextEntry.id)
    const savedEntry = {
      ...nextEntry,
      id: nextEntry.id || crypto.randomUUID(),
      createdAt: nextEntry.createdAt || today,
      updatedAt: nextEntry.updatedAt || today,
    }
    const statusEntries = isNew
      ? [savedEntry, ...data.statusEntries]
      : data.statusEntries.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry))

    const saved = await setStatusEntries(statusEntries)
    if (!saved) {
      setRowErrors((current) => ({ ...current, [savedEntry.id]: syncError || 'Statusdaten konnten nicht gespeichert werden.' }))
      markRow(savedEntry.id, 'error')
      return
    }
    setNewEntry(null)
    setRowErrors((current) => ({ ...current, [savedEntry.id]: '' }))
    markRow(savedEntry.id, 'success')
  }

  async function deleteEntry(id) {
    await setStatusEntries(data.statusEntries.filter((entry) => entry.id !== id))
  }

  function handleAddEntry() {
    setNewEntry({ ...emptyStatusEntry, id: crypto.randomUUID(), createdAt: today, updatedAt: today })
  }

  function markRow(id, state) {
    setRowFlash((current) => ({ ...current, [id]: state }))
    window.setTimeout(() => {
      setRowFlash((current) => ({ ...current, [id]: '' }))
    }, 800)
  }

  function showPanel(panel) {
    setActivePanel(panel)
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <div className="grid min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="sticky top-6 flex flex-col gap-6">
            <div>
              <p className="font-display text-sm font-medium uppercase text-[var(--text-primary)]">
                Expertenstatus
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Pflege Status, Verantwortung und Hinweise für die öffentliche Ansicht.
              </p>
            </div>
            <nav className="flex gap-2 lg:grid">
              <SidebarItem active={activePanel === 'entries'} onClick={() => showPanel('entries')}>
                Einträge
              </SidebarItem>
              <SidebarItem active={activePanel === 'settings'} onClick={() => showPanel('settings')}>
                Anzeige
              </SidebarItem>
            </nav>
            {activePanel === 'entries' && (
              <Button variant="ghost" onClick={handleAddEntry} className="justify-start">
                + Eintrag hinzufügen
              </Button>
            )}
            {onOpenStatus && (
              <Button variant="ghost" onClick={onOpenStatus} className="justify-start">
                Statusansicht öffnen
              </Button>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-base)]/82 px-4 py-4 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div>
                <span className="badge bg-[var(--bg-surface)] text-[var(--accent)]">Admin</span>
                <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {activePanel === 'settings' ? 'Anzeigeoptionen' : 'Internes Dashboard'}
                </h1>
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
            {activePanel === 'entries' ? (
              <section className="grid gap-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                      Status-Einträge
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Inline bearbeiten, speichern und bei Bedarf entfernen.
                    </p>
                  </div>
                  <span className="label">{data.statusEntries.length} Einträge</span>
                </div>

                {newEntry && (
                  <AdminRow
                    entry={newEntry}
                    isNew
                    onSave={saveEntry}
                    onCancelNew={() => setNewEntry(null)}
                    flash={rowFlash[newEntry.id]}
                    error={rowErrors[newEntry.id]}
                  />
                )}

                {data.statusEntries.map((entry) => (
                  <AdminRow
                    key={`${entry.id}:${entry.title}:${entry.updatedAt}`}
                    entry={entry}
                    onSave={saveEntry}
                    onDelete={() => deleteEntry(entry.id)}
                    flash={rowFlash[entry.id]}
                    error={rowErrors[entry.id]}
                  />
                ))}

                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + Eintrag hinzufügen
                </button>
              </section>
            ) : (
              <DisplaySettingsPanel settings={data.settings} setSettings={setSettings} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

const displaySettingOptions = [
  ['showHeaderSummary', 'Header-Zusammenfassung'],
  ['showNextDue', 'Nächste Frist'],
  ['showStats', 'Status-Kacheln'],
  ['showFilters', 'Filterleiste'],
  ['showCategories', 'Kategorie-Überschriften'],
  ['showProgress', 'Fortschrittsbalken'],
  ['showLiveStatusPill', 'Aktuell-Pill anzeigen'],
  ['showLiveAge', 'Live-Alter anzeigen'],
]

function DisplaySettingsPanel({ settings, setSettings }) {
  function updateSetting(key, checked) {
    setSettings({
      ...settings,
      [key]: checked,
      ...(key === 'showHeaderSummary' && !checked ? { showNextDue: false } : {}),
      ...(key === 'showLiveStatusPill' && !checked ? { showLiveAge: false } : {}),
    })
  }

  return (
    <section className="card grid gap-4 px-4 py-4 shadow-none">
      <div>
        <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
          Anzeigeoptionen
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Sichtbarkeit einzelner Bereiche in der Statusansicht.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {displaySettingOptions.map(([key, label]) => {
          const disabled =
            (key === 'showNextDue' && !settings.showHeaderSummary) ||
            (key === 'showLiveAge' && !settings.showLiveStatusPill)
          return (
            <label
              key={key}
              className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2.5 ${
                disabled ? 'opacity-55' : ''
              }`}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                disabled={disabled}
                onChange={(event) => updateSetting(key, event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          )
        })}
      </div>
    </section>
  )
}

function SidebarItem({ active = false, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-semibold ${
        active
          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

export default App
