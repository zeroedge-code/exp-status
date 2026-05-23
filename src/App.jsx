import { useEffect, useRef, useState } from 'react'
import { StatusPage } from './statusShared.jsx'
import {
  categories,
  createInitialStatusEntries,
  defaultDisplaySettings,
  normalizeDisplaySettings,
  normalizeStatusEntries,
  ownerOptions,
  priorityOptions,
  statusOptions,
  typeOptions,
} from './statusData.js'

const today = new Date().toISOString().slice(0, 10)

const emptyStatusEntry = {
  category: categories[0],
  title: '',
  status: statusOptions[0],
  owner: ownerOptions[0],
  type: typeOptions[0],
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
    } catch (error) {
      if (requestId !== saveRequestId.current) return
      setData(previousData)
      setSyncError(error.message)
      setSyncState('error')
    }
  }

  const isIntern = adminOnly || path === '/intern'

  return (
    <div className="min-h-screen">
      {isIntern && (
        <TopNavigation path={path} navigate={navigate} adminOnly={adminOnly} />
      )}
      <SyncBanner syncState={syncState} syncError={syncError} adminOnly={adminOnly} />
      {isIntern ? (
        <InternPage data={data} updateData={updateData} />
      ) : (
        <StatusPage statusEntries={data.statusEntries} settings={data.settings} />
      )}
    </div>
  )
}

function SyncBanner({ syncState, syncError, adminOnly }) {
  if (syncState === 'ready' || syncState === 'saved') return null
  if (!adminOnly && syncState !== 'error') return null

  const messages = {
    loading: 'Zentrale Statusdaten werden geladen.',
    saving: 'Änderungen werden zentral gespeichert.',
    error:
      'Zentrale Speicherung ist nicht erreichbar. Bitte Cloudflare KV-Binding prüfen.',
  }

  return (
    <div
      className={`border-b px-4 py-3 text-sm ${
        syncState === 'error'
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]'
          : 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]'
      }`}
    >
      <div className="mx-auto max-w-7xl">
        {syncState === 'error' && syncError
          ? syncError
          : adminOnly
            ? messages[syncState]
            : syncState === 'error'
              ? messages.error
              : null}
      </div>
    </div>
  )
}

function TopNavigation({ path, navigate, adminOnly }) {
  return (
    <header className="border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/status')}
          className="text-left"
        >
          <p className="text-xs font-bold uppercase text-[var(--color-accent)]">
            Experten-Portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
            Dein Überblick
          </h1>
        </button>
        {!adminOnly && (
          <nav className="inline-flex w-fit rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] p-1">
            <NavButton active={path !== '/intern'} onClick={() => navigate('/status')}>
              Status
            </NavButton>
            {path === '/intern' && (
              <NavButton active onClick={() => navigate('/intern')}>
                Intern
              </NavButton>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

function NavButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--border-radius-md)] px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-[var(--color-background-primary)] text-[var(--color-text-primary)] shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

function InternPage({ data, updateData }) {
  return <Dashboard data={data} updateData={updateData} />
}

function Dashboard({ data, updateData }) {
  function setStatusEntries(statusEntries) {
    updateData({ ...data, statusEntries })
  }

  function setSettings(settings) {
    updateData({ ...data, settings })
  }

  return (
    <main>
      <section className="border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase text-[var(--color-accent)]">
              Geschützter Bereich
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Internes Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              Pflege die Themen, die im Experten-Dashboard sichtbar sind.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <StatusManager
          statusEntries={data.statusEntries}
          setStatusEntries={setStatusEntries}
          settings={data.settings}
          setSettings={setSettings}
        />
      </div>
    </main>
  )
}

function StatusManager({ statusEntries, setStatusEntries, settings, setSettings }) {
  const [draft, setDraft] = useState(emptyStatusEntry)
  const [editingId, setEditingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function saveEntry(event) {
    event.preventDefault()
    if (!draft.title.trim()) return

    if (editingId) {
      setStatusEntries(
        statusEntries.map((entry) =>
          entry.id === editingId
            ? { ...draft, id: editingId, createdAt: entry.createdAt || draft.createdAt }
            : entry,
        ),
      )
    } else {
      setStatusEntries([
        {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...statusEntries,
      ])
    }
    setDraft({
      ...emptyStatusEntry,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    })
    setEditingId(null)
    setConfirmDeleteId(null)
  }

  function editEntry(entry) {
    setDraft(entry)
    setEditingId(entry.id)
    setConfirmDeleteId(null)
  }

  function deleteEntry(id) {
    setStatusEntries(statusEntries.filter((entry) => entry.id !== id))
    if (editingId === id) setEditingId(null)
    setConfirmDeleteId(null)
  }

  return (
    <section className="rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-5">
      <div className="border-b border-[var(--color-border-tertiary)] pb-3">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Experteneinträge</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Inhalte, die in der öffentlichen Statusansicht erscheinen.
        </p>
      </div>
      <DisplaySettingsPanel settings={settings} setSettings={setSettings} />
      <EntryForm
        draft={draft}
        setDraft={setDraft}
        onSubmit={saveEntry}
        editing={Boolean(editingId)}
        onCancel={() => {
          setDraft(emptyStatusEntry)
          setEditingId(null)
          setConfirmDeleteId(null)
        }}
      />
      <div className="mt-6 grid gap-2">
        {statusEntries.map((entry) => (
          <ManageRow
            key={entry.id}
            entry={entry}
            onEdit={() => editEntry(entry)}
            onRequestDelete={() => setConfirmDeleteId(entry.id)}
            onConfirmDelete={() => deleteEntry(entry.id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
            confirmingDelete={confirmDeleteId === entry.id}
          />
        ))}
      </div>
    </section>
  )
}

const displaySettingOptions = [
  {
    key: 'showHeaderSummary',
    label: 'Header-Zusammenfassung',
    description: 'Zeigt oben die Anzahl offener Einträge.',
  },
  {
    key: 'showNextDue',
    label: 'Nächste Frist',
    description: 'Ergänzt die nächste Fälligkeit im Header.',
    dependsOn: 'showHeaderSummary',
  },
  {
    key: 'showStats',
    label: 'Status-Kacheln',
    description: 'Zeigt die Zähler für Offen, Neu und Erledigt.',
  },
  {
    key: 'showFilters',
    label: 'Filterleiste',
    description: 'Erlaubt Filtern nach Status und Verantwortung.',
  },
  {
    key: 'showCategories',
    label: 'Kategorie-Überschriften',
    description: 'Gruppiert Einträge mit Icons und Zählern.',
  },
  {
    key: 'showProgress',
    label: 'Fortschrittsbalken',
    description: 'Zeigt Prozessfortschritt auf Prozesskarten.',
  },
]

function DisplaySettingsPanel({ settings, setSettings }) {
  function updateSetting(key, checked) {
    setSettings({
      ...settings,
      [key]: checked,
      ...(key === 'showHeaderSummary' && !checked ? { showNextDue: false } : {}),
    })
  }

  return (
    <section className="mt-5 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Anzeigeoptionen</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Steuert, welche Elemente in der öffentlichen Statusansicht sichtbar sind.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {displaySettingOptions.map((option) => {
          const disabled = option.dependsOn && !settings[option.dependsOn]
          return (
            <label
              key={option.key}
              className={`flex items-start gap-3 rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-3 ${
                disabled ? 'opacity-55' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(settings[option.key])}
                disabled={disabled}
                onChange={(event) => updateSetting(option.key, event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-secondary)]">
                  {option.description}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

function EntryForm({ draft, setDraft, onSubmit, editing, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-5">
      <FormSection title="Inhalt">
        <Field label="Titel">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Beschreibung">
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            className={`${inputClass} min-h-28`}
          />
        </Field>
      </FormSection>

      <FormSection title="Einordnung">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategorie">
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Typ">
            <select
              value={draft.type}
              onChange={(event) => {
                const type = event.target.value
                setDraft({
                  ...draft,
                  type,
                  showProgress: type === 'process',
                  priority: type === 'info' ? '' : draft.priority || priorityOptions[0],
                })
              }}
              className={inputClass}
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Status & Verantwortung">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              className={inputClass}
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Priorität">
            <select
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              className={inputClass}
            >
              <option value="">Keine Priorität</option>
              {priorityOptions.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </Field>
          <Field label="Verantwortlicher">
            <select
              value={draft.owner}
              onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
              className={inputClass}
            >
              {ownerOptions.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Termine">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Datum letzter Stand">
            <input
              type="date"
              value={draft.updatedAt}
              onChange={(event) => setDraft({ ...draft, updatedAt: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Fälligkeitsdatum">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </FormSection>

      <FormActions editing={editing} onCancel={onCancel} />
    </form>
  )
}

function FormSection({ title, children }) {
  return (
    <fieldset className="rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {title}
      </legend>
      <div className="mt-2 grid gap-4">{children}</div>
    </fieldset>
  )
}

const inputClass =
  'mt-2 w-full rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus)]'

function formatType(type) {
  const labels = {
    info: 'Info',
    task: 'Aufgabe',
    process: 'Prozess',
  }
  return labels[type] || 'Info'
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
      {label}
      {children}
    </label>
  )
}

function FormActions({ editing, onCancel }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="submit"
        className="rounded-[var(--border-radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95"
      >
        {editing ? 'Änderungen speichern' : 'Anlegen'}
      </button>
      {editing && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-background-secondary)]"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}

function ManageRow({
  entry,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  confirmingDelete,
}) {
  return (
    <article className="flex flex-col gap-3 rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className="truncate font-semibold text-[var(--color-text-primary)]">{entry.title}</h4>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <AdminChip>{entry.category}</AdminChip>
          <AdminChip tone={entry.status === 'Erledigt' ? 'success' : entry.status === 'Neu' ? 'accent' : 'warning'}>
            {entry.status}
          </AdminChip>
          <AdminChip>{entry.owner}</AdminChip>
          <AdminChip>{formatType(entry.type)}</AdminChip>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {confirmingDelete ? (
          <DeleteConfirmActions
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-background-secondary)]"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={onRequestDelete}
              className="rounded-[var(--border-radius-md)] border border-[var(--color-danger)] bg-[var(--color-background-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-danger-text)] shadow-sm hover:bg-[var(--color-danger-soft)]"
            >
              Löschen
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function AdminChip({ tone = 'neutral', children }) {
  const toneClass = {
    accent: 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]',
    success: 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
    warning: 'border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]',
    neutral: 'border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)]',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

function DeleteConfirmActions({ onConfirm, onCancel }) {
  return (
    <>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-[var(--border-radius-md)] bg-[var(--color-danger)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95"
      >
        Löschen bestätigen
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-background-secondary)]"
      >
        Abbrechen
      </button>
    </>
  )
}

export default App
