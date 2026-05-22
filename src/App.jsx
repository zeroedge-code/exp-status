import { useEffect, useRef, useState } from 'react'
import { StatusPage } from './statusShared.jsx'
import {
  categories,
  createInitialStatusEntries,
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
  tasks: [],
}

const localDevStorageKey = 'expertenstatus-local-dev-data'
const useLocalDevStore =
  import.meta.env.DEV && import.meta.env.MODE !== 'test' && !import.meta.env.VITE_APP_TARGET

function normalizeData(rawData) {
  return {
    statusEntries: normalizeStatusEntries(rawData, initialData.statusEntries),
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
        <StatusPage statusEntries={data.statusEntries} />
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
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : 'border-sky-200 bg-sky-50 text-sky-900'
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
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/status')}
          className="text-left"
        >
          <p className="text-xs font-bold uppercase text-teal-700">
            Experten-Portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Dein Überblick
          </h1>
        </button>
        {!adminOnly && (
          <nav className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-1">
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
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white text-slate-950 shadow-sm'
          : 'text-slate-600 hover:text-slate-950'
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

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase text-teal-700">
              Geschützter Bereich
            </p>
            <h1 className="text-2xl font-semibold text-slate-950">
              Internes Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pflege die Themen, die im Experten-Dashboard sichtbar sind.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <StatusManager
          statusEntries={data.statusEntries}
          setStatusEntries={setStatusEntries}
        />
      </div>
    </main>
  )
}

function StatusManager({ statusEntries, setStatusEntries }) {
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
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-semibold text-slate-950">Experteneinträge</h2>
        <p className="mt-1 text-sm text-slate-500">
          Inhalte, die in der öffentlichen Statusansicht erscheinen.
        </p>
      </div>
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
      <div className="mt-6 space-y-3">
        {statusEntries.map((entry) => (
          <ManageRow
            key={entry.id}
            title={entry.title}
            meta={`${entry.category} · ${entry.status} · ${entry.owner} · ${formatType(entry.type)}`}
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
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      <div className="mt-2 grid gap-4">{children}</div>
    </fieldset>
  )
}

const inputClass =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100'

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
    <label className="block text-sm font-medium text-slate-700">
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
        className="rounded-md bg-teal-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
      >
        {editing ? 'Änderungen speichern' : 'Anlegen'}
      </button>
      {editing && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}

function ManageRow({
  title,
  meta,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  confirmingDelete,
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="font-semibold text-slate-950">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{meta}</p>
      </div>
      <div className="flex gap-2">
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
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={onRequestDelete}
              className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
            >
              Löschen
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function DeleteConfirmActions({ onConfirm, onCancel }) {
  return (
    <>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
      >
        Löschen bestätigen
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
      >
        Abbrechen
      </button>
    </>
  )
}

export default App
