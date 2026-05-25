import { useEffect, useMemo, useRef, useState } from 'react'
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
  revision: 1,
  statusEntries: createInitialStatusEntries(),
  settings: defaultDisplaySettings,
  tasks: [],
}

const localDevStorageKey = 'expertenstatus-local-dev-data'
const useLocalDevStore =
  import.meta.env.DEV && import.meta.env.MODE !== 'test' && !import.meta.env.VITE_APP_TARGET

function normalizeData(rawData) {
  return {
    revision: Number.isInteger(rawData?.revision) && rawData.revision > 0 ? rawData.revision : 1,
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

async function fetchData(useMockData = false) {
  if (useMockData) {
    const { mockStatusData } = await import('./statusMockData.js')
    return normalizeData({
      ...initialData,
      statusEntries: mockStatusData.statusEntries,
      settings: mockStatusData.settings,
    })
  }

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
    const nextNormalizedData = normalizeData(nextData)
    const normalizedData = {
      ...nextNormalizedData,
      revision: nextNormalizedData.revision + 1,
    }
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

async function saveSettings(settings, revision) {
  if (useLocalDevStore) {
    const stored = window.localStorage.getItem(localDevStorageKey)
    const currentData = stored ? normalizeData(JSON.parse(stored)) : initialData
    const normalizedData = normalizeData({
      ...currentData,
      revision: currentData.revision + 1,
      settings: {
        ...currentData.settings,
        ...settings,
      },
    })
    window.localStorage.setItem(localDevStorageKey, JSON.stringify(normalizedData))
    return normalizedData
  }

  const response = await fetch('/api/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision, settings }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? ` ${payload.details.join(' ')}` : ''
    throw new Error(
      payload?.error
        ? `${payload.error}${details}`
        : 'Anzeigeoptionen konnten nicht gespeichert werden.',
    )
  }
  return normalizeData(payload)
}

function App({ adminOnly = false }) {
  const [data, setData] = useState(initialData)
  const [syncState, setSyncState] = useState('loading')
  const [syncError, setSyncError] = useState('')
  const [path, setPath] = useState(adminOnly ? '/intern' : window.location.pathname)
  const [useMockData, setUseMockData] = useState(() => shouldUseMockStatusData())
  const saveRequestId = useRef(0)

  useEffect(() => {
    document.title = adminOnly || path === '/intern' ? 'Expertenstatus Admin' : 'Expertenstatus'
  }, [adminOnly, path])

  useEffect(() => {
    let active = true
    fetchData(useMockData)
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
  }, [useMockData])

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

  async function updateSettings(settings) {
    const requestId = saveRequestId.current + 1
    saveRequestId.current = requestId
    const previousData = data
    const optimisticData = normalizeData({
      ...data,
      settings: {
        ...data.settings,
        ...settings,
      },
    })
    setData(optimisticData)
    setSyncError('')
    setSyncState('saving')
    try {
      const savedData = await saveSettings(optimisticData.settings, data.revision)
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

  function toggleMockData(enabled) {
    setSyncState('loading')
    setUseMockData(enabled)
    updateMockQuery(enabled)
  }

  return (
    <div className="min-h-screen">
      <SyncBanner syncState={syncState} syncError={syncError} adminOnly={adminOnly} />
      {isIntern ? (
        <AdminDashboard
          data={data}
          updateData={updateData}
          updateSettings={updateSettings}
          syncError={syncError}
          onOpenStatus={adminOnly ? null : () => navigate('/status')}
        />
      ) : (
        <>
          {shouldShowMockToggle() && (
            <MockDataToggle enabled={useMockData} onChange={toggleMockData} />
          )}
          <StatusPage
            statusEntries={data.statusEntries}
            settings={data.settings}
            loading={syncState === 'loading'}
          />
        </>
      )}
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

function AdminDashboard({ data, updateData, updateSettings, syncError, onOpenStatus }) {
  const [newEntry, setNewEntry] = useState(null)
  const [rowFlash, setRowFlash] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const [rowSaveStates, setRowSaveStates] = useState({})
  const [activePanel, setActivePanel] = useState('entries')
  const [entrySearch, setEntrySearch] = useState('')
  const [entryStatusFilter, setEntryStatusFilter] = useState('all')
  const [entrySortMode, setEntrySortMode] = useState('updated_desc')
  const [settingsSaveState, setSettingsSaveState] = useState('idle')
  const [settingsError, setSettingsError] = useState('')

  function setStatusEntries(statusEntries) {
    return updateData({ ...data, statusEntries })
  }

  function setRowSaveState(id, state) {
    setRowSaveStates((current) => ({ ...current, [id]: state }))
  }

  function clearRowState(id) {
    setRowErrors((current) => ({ ...current, [id]: '' }))
    setRowSaveStates((current) => ({ ...current, [id]: 'idle' }))
  }

  async function setSettings(settings) {
    setSettingsSaveState('saving')
    setSettingsError('')
    const saved = await updateSettings(settings)
    if (saved) {
      setSettingsSaveState('saved')
      window.setTimeout(() => setSettingsSaveState('idle'), 1400)
      return true
    }
    setSettingsSaveState('error')
    setSettingsError(syncError || 'Anzeigeoptionen konnten nicht gespeichert werden.')
    return false
  }

  async function saveEntry(nextEntry) {
    const isNew = !data.statusEntries.some((entry) => entry.id === nextEntry.id)
    const savedEntry = {
      ...nextEntry,
      id: nextEntry.id || crypto.randomUUID(),
      createdAt: nextEntry.createdAt || today,
      updatedAt: nextEntry.updatedAt || today,
    }
    setRowSaveState(savedEntry.id, 'saving')
    setRowErrors((current) => ({ ...current, [savedEntry.id]: '' }))
    const statusEntries = isNew
      ? [savedEntry, ...data.statusEntries]
      : data.statusEntries.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry))

    const saved = await setStatusEntries(statusEntries)
    if (!saved) {
      setRowSaveState(savedEntry.id, 'error')
      setRowErrors((current) => ({
        ...current,
        [savedEntry.id]: syncError || 'Statusdaten konnten nicht gespeichert werden.',
      }))
      markRow(savedEntry.id, 'error')
      return
    }
    setNewEntry(null)
    setRowSaveState(savedEntry.id, 'saved')
    window.setTimeout(() => setRowSaveState(savedEntry.id, 'idle'), 1400)
    setRowErrors((current) => ({ ...current, [savedEntry.id]: '' }))
    markRow(savedEntry.id, 'success')
  }

  async function deleteEntry(id) {
    await setStatusEntries(data.statusEntries.filter((entry) => entry.id !== id))
    setRowErrors((current) => ({ ...current, [id]: '' }))
    setRowSaveStates((current) => ({ ...current, [id]: 'idle' }))
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

  const visibleEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase()
    const filtered = data.statusEntries.filter((entry) => {
      const matchesQuery =
        query.length === 0 ||
        [entry.title, entry.description, entry.category, entry.owner, entry.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))

      const matchesStatus =
        entryStatusFilter === 'all' ||
        (entryStatusFilter === 'open'
          ? entry.status === 'Neu' || entry.status === 'Offen' || entry.status === 'Dringend'
          : entry.status.toLowerCase() === entryStatusFilter)

      return matchesQuery && matchesStatus
    })

    return filtered.sort((firstEntry, secondEntry) => compareEntries(firstEntry, secondEntry, entrySortMode))
  }, [data.statusEntries, entrySearch, entrySortMode, entryStatusFilter])

  const hasEntryFilters =
    entrySearch.trim().length > 0 || entryStatusFilter !== 'all' || entrySortMode !== 'updated_desc'

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
              <SidebarItem
                active={activePanel === 'entries'}
                onClick={() => showPanel('entries')}
                ariaLabel="Einträge"
              >
                Einträge
              </SidebarItem>
              <SidebarItem
                active={activePanel === 'settings'}
                onClick={() => showPanel('settings')}
                ariaLabel="Anzeige"
              >
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                      Status-Einträge
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Inline bearbeiten, speichern und bei Bedarf entfernen.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label">
                      {visibleEntries.length} von {data.statusEntries.length} Einträgen
                    </span>
                    {hasEntryFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEntrySearch('')
                          setEntryStatusFilter('all')
                          setEntrySortMode('updated_desc')
                        }}
                      >
                        Filter zurücksetzen
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                  <label className="grid gap-1.5">
                    <span className="label">Suche</span>
                    <input
                      value={entrySearch}
                      onChange={(event) => setEntrySearch(event.target.value)}
                      className="field"
                      placeholder="Titel, Kategorie oder Hinweis"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="label">Status</span>
                    <select
                      value={entryStatusFilter}
                      onChange={(event) => setEntryStatusFilter(event.target.value)}
                      className="field select-field"
                    >
                      <option value="all">Alle</option>
                      <option value="neu">Neu</option>
                      <option value="open">In Bearbeitung</option>
                      <option value="erledigt">Erledigt</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="label">Sortierung</span>
                    <select
                      value={entrySortMode}
                      onChange={(event) => setEntrySortMode(event.target.value)}
                      className="field select-field"
                    >
                      <option value="updated_desc">Zuletzt aktualisiert</option>
                      <option value="due_asc">Fällig zuerst</option>
                      <option value="title_asc">Titel A-Z</option>
                    </select>
                  </label>
                </div>

                {newEntry && (
                    <AdminRow
                      entry={newEntry}
                      isNew
                      onSave={saveEntry}
                      onCancelNew={() => setNewEntry(null)}
                      onEdit={() => clearRowState(newEntry.id)}
                      flash={rowFlash[newEntry.id]}
                      error={rowErrors[newEntry.id]}
                      saveState={rowSaveStates[newEntry.id] || 'idle'}
                    />
                )}

                {visibleEntries.length > 0 ? (
                  visibleEntries.map((entry) => (
                    <AdminRow
                      key={`${entry.id}:${entry.title}:${entry.updatedAt}`}
                      entry={entry}
                      onSave={saveEntry}
                      onDelete={() => deleteEntry(entry.id)}
                      onEdit={() => clearRowState(entry.id)}
                      flash={rowFlash[entry.id]}
                      error={rowErrors[entry.id]}
                      saveState={rowSaveStates[entry.id] || 'idle'}
                    />
                  ))
                ) : !newEntry ? (
                  <EmptyEntriesState
                    hasFilters={hasEntryFilters}
                    onResetFilters={() => {
                      setEntrySearch('')
                      setEntryStatusFilter('all')
                      setEntrySortMode('updated_desc')
                    }}
                    onAddEntry={handleAddEntry}
                  />
                ) : null}

                {visibleEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    + Eintrag hinzufügen
                  </button>
                )}
              </section>
            ) : (
              <DisplaySettingsPanel
                settings={data.settings}
                setSettings={setSettings}
                saveState={settingsSaveState}
                saveError={settingsError}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function compareEntries(firstEntry, secondEntry, sortMode) {
  if (sortMode === 'title_asc') {
    return firstEntry.title.localeCompare(secondEntry.title)
  }

  if (sortMode === 'due_asc') {
    return getSortDate(firstEntry).getTime() - getSortDate(secondEntry).getTime()
  }

  return getSortDate(secondEntry).getTime() - getSortDate(firstEntry).getTime()
}

function getSortDate(entry) {
  const timestamp = Date.parse(`${entry.updatedAt || entry.createdAt}T00:00:00`)
  if (Number.isFinite(timestamp)) return new Date(timestamp)
  return new Date(0)
}

function EmptyEntriesState({ hasFilters, onResetFilters, onAddEntry }) {
  return (
    <div className="card grid gap-3 px-5 py-8 text-center shadow-none">
      <p className="font-display text-sm font-medium text-[var(--text-primary)]">
        {hasFilters ? 'Keine passenden Einträge' : 'Keine Einträge vorhanden'}
      </p>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {hasFilters
          ? 'Passe Suche, Status oder Sortierung an oder setze die Filter zurück.'
          : 'Lege den ersten Eintrag an, um Inhalte in der Statusansicht sichtbar zu machen.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters}>
            Filter zurücksetzen
          </Button>
        )}
        <Button size="sm" onClick={onAddEntry}>
          Eintrag hinzufügen
        </Button>
      </div>
    </div>
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

function DisplaySettingsPanel({ settings, setSettings, saveState = 'idle', saveError = '' }) {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
            Anzeigeoptionen
          </h2>
          <SettingsSaveStatus state={saveState} error={saveError} />
        </div>
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
      <StatusLegend />
    </section>
  )
}

function SettingsSaveStatus({ state, error }) {
  if (state === 'idle') return null

  const meta = {
    saving: {
      label: 'Speichert...',
      color: 'var(--accent)',
      background: 'var(--color-accent-soft)',
    },
    saved: {
      label: 'Gespeichert',
      color: 'var(--success)',
      background: 'var(--color-success-soft)',
    },
    error: {
      label: error || 'Fehler beim Speichern',
      color: 'var(--danger)',
      background: 'var(--color-danger-soft)',
    },
  }[state]

  return (
    <span
      className="badge normal-case"
      style={{ color: meta.color, background: meta.background }}
    >
      {state === 'saving' && <span className="spinner h-3 w-3" aria-hidden="true" />}
      {meta.label}
    </span>
  )
}

const legendGroups = [
  {
    title: 'Statusfarben',
    items: [
      {
        label: 'Neu',
        description: 'Frisch angelegte Themen, die noch eingeordnet werden',
        color: 'var(--success)',
        background: 'var(--color-success-soft)',
        ring: true,
      },
      {
        label: 'In Bearbeitung',
        description: 'Aktive Aufgaben oder Themen mit ausstehender Klärung',
        color: 'var(--warning)',
        background: 'var(--color-warning-soft)',
      },
      {
        label: 'Erledigt',
        description: 'Abgeschlossene Themen ohne weiteren Handlungsbedarf',
        color: 'var(--text-muted)',
        background: 'var(--bg-elevated)',
      },
      {
        label: 'Unbekannt',
        description: 'Fallback, falls ein Status nicht zugeordnet werden kann',
        color: 'var(--danger)',
        background: 'var(--color-danger-soft)',
      },
    ],
  },
  {
    title: 'Admin-Hinweise',
    items: [
      {
        label: 'Ungespeichert',
        description: 'Gelber Punkt an einer Zeile mit lokalen Änderungen',
        color: 'var(--warning)',
        background: 'var(--color-warning-soft)',
      },
      {
        label: 'Gespeichert',
        description: 'Grüner Rahmen nach erfolgreichem Speichern',
        color: 'var(--success)',
        background: 'var(--color-success-soft)',
      },
      {
        label: 'Fehler',
        description: 'Roter Rahmen und Meldung bei fehlgeschlagenem Speichern',
        color: 'var(--danger)',
        background: 'var(--color-danger-soft)',
      },
      {
        label: 'Aktuell-Pill',
        description: 'Live-Indikator im Status-Header, im Admin ausblendbar',
        color: 'var(--success)',
        background: '#f0fdf4',
        ring: true,
      },
    ],
  },
]

function StatusLegend() {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <div className="mb-3">
        <h3 className="font-display text-sm font-medium text-[var(--text-primary)]">
          Legende
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Bedeutung der Farben und Zustände in Statusansicht und Admin.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {legendGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] p-3"
          >
            <p className="label mb-3">{group.title}</p>
            <div className="grid gap-2">
              {group.items.map((item) => (
                <LegendItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendItem({ item }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] px-3 py-2">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.ring ? 'status-dot-available' : ''}`}
        style={{ position: 'relative', background: item.color }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="badge"
            style={{ color: item.color, background: item.background }}
          >
            {item.label}
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
          {item.description}
        </p>
      </div>
    </div>
  )
}

function SidebarItem({ active = false, children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel}
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
