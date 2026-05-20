import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'expertiger-status-app-v1'

const categories = [
  'Finanzen & Expertenzahlungen',
  'Marketing',
  'Abstimmung & Organisation',
  'Sonstiges',
]

const categoryMigration = {
  'Finanzierung & Bank': 'Finanzen & Expertenzahlungen',
  Organisation: 'Abstimmung & Organisation',
}

const statusOptions = [
  'Antwort ausstehend',
  'In Bearbeitung',
  'Abgeschlossen',
  'Dringend',
]

const emptyStatusEntry = {
  category: categories[0],
  title: '',
  status: statusOptions[0],
  updatedAt: new Date().toISOString().slice(0, 10),
  description: '',
}

const emptyTask = {
  title: '',
  owner: '',
  dueDate: new Date().toISOString().slice(0, 10),
  reminderInterval: 'einmalig',
  notes: '',
  visibility: 'nur intern',
  completed: false,
}

const initialData = {
  statusEntries: [
    {
      id: crypto.randomUUID(),
      category: 'Finanzen & Expertenzahlungen',
      title: 'Rückmeldung Zahlungsunterlagen',
      status: 'Antwort ausstehend',
      updatedAt: '2026-05-18',
      description:
        'Die eingereichten Unterlagen liegen zur Prüfung vor. Der nächste Stand wird nach Eingang der Rückmeldung ergänzt.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Marketing',
      title: 'Abstimmung Kampagnenmaterial',
      status: 'In Bearbeitung',
      updatedAt: '2026-05-20',
      description:
        'Entwürfe werden intern konsolidiert und anschließend für die Freigabe vorbereitet.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Abstimmung & Organisation',
      title: 'Terminplanung Expertenrunde',
      status: 'Abgeschlossen',
      updatedAt: '2026-05-16',
      description:
        'Die Terminserie ist bestätigt. Weitere Änderungen werden separat dokumentiert.',
    },
  ],
  tasks: [],
}

function normalizeData(rawData) {
  return {
    statusEntries: Array.isArray(rawData.statusEntries)
      ? rawData.statusEntries.map((entry) => ({
          ...entry,
          category: categoryMigration[entry.category] || entry.category,
        }))
      : initialData.statusEntries,
    tasks: Array.isArray(rawData.tasks)
      ? rawData.tasks.map((task) => ({
          ...task,
          completed: Boolean(task.completed),
        }))
      : initialData.tasks,
  }
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialData
    const parsed = JSON.parse(stored)
    return normalizeData(parsed)
  } catch {
    return initialData
  }
}

function daysUntil(dateValue) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateValue}T00:00:00`)
  return Math.ceil((target - today) / 86400000)
}

function formatDate(dateValue) {
  if (!dateValue) return 'Kein Datum'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`))
}

function getDueTasks(tasks, days) {
  return tasks
    .filter((task) => {
      const diff = daysUntil(task.dueDate)
      return diff <= days
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

function App() {
  const [data, setData] = useState(loadData)
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const upcomingSevenDays = useMemo(
    () => getDueTasks(data.tasks.filter((task) => !task.completed), 7),
    [data.tasks],
  )

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  function updateData(nextData) {
    setData(nextData)
  }

  return (
    <div className="min-h-screen">
      <TopNavigation path={path} navigate={navigate} />
      {path === '/intern' && upcomingSevenDays.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-100/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <strong>
              {upcomingSevenDays.length} offene Aufgabe
              {upcomingSevenDays.length === 1 ? '' : 'n'} überfällig oder bald fällig
            </strong>
            <span>Details sind im internen Dashboard sichtbar.</span>
          </div>
        </div>
      )}
      {path === '/intern' ? (
        <InternPage data={data} updateData={updateData} />
      ) : (
        <StatusPage statusEntries={data.statusEntries} />
      )}
    </div>
  )
}

function TopNavigation({ path, navigate }) {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/status')}
          className="text-left"
        >
          <p className="text-xs font-bold uppercase text-teal-700">
            Expertenstatus
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Status & Erinnerungen
          </h1>
        </button>
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

function StatusPage({ statusEntries }) {
  const groupedEntries = categories.map((category) => ({
    category,
    entries: statusEntries.filter((entry) => entry.category === category),
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8 rounded-xl border border-white bg-white/70 p-6 shadow-sm">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-teal-700">
            Öffentlich lesbar
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">
            Aktueller Stand für Experten
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Übersicht aller sichtbaren Themen mit Kategorie, Status und letztem
            dokumentierten Stand.
          </p>
        </div>
      </section>

      <div className="space-y-8">
        {groupedEntries.map(({ category, entries }) => (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">{category}</h3>
              <span className="text-sm text-slate-500">{entries.length} Einträge</span>
            </div>
            {entries.length === 0 ? (
              <EmptyState text="Keine Einträge in dieser Kategorie." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {entries.map((entry) => (
                  <StatusCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}

function StatusCard({ entry }) {
  const borderStyles = {
    'Antwort ausstehend': 'border-l-sky-500',
    'In Bearbeitung': 'border-l-indigo-500',
    Abgeschlossen: 'border-l-emerald-500',
    Dringend: 'border-l-rose-500',
  }

  return (
    <article
      className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderStyles[entry.status]}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">{entry.category}</p>
          <h4 className="mt-1 text-xl font-semibold text-slate-950">{entry.title}</h4>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{entry.description}</p>
      <p className="mt-5 inline-flex rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-600">
        Letzter Stand: <span className="font-medium">{formatDate(entry.updatedAt)}</span>
      </p>
    </article>
  )
}

function StatusBadge({ status }) {
  const styles = {
    'Antwort ausstehend': 'bg-sky-100 text-sky-900 ring-sky-200',
    'In Bearbeitung': 'bg-indigo-100 text-indigo-900 ring-indigo-200',
    Abgeschlossen: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    Dringend: 'bg-rose-100 text-rose-900 ring-rose-200',
  }

  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-3 py-1 text-xs font-bold ring-1 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function InternPage({ data, updateData }) {
  return <Dashboard data={data} updateData={updateData} />
}

function Dashboard({ data, updateData }) {
  const dueTasks = useMemo(
    () => getDueTasks(data.tasks.filter((task) => !task.completed), 14),
    [data.tasks],
  )
  const metrics = useMemo(() => getDashboardMetrics(data), [data])

  function setStatusEntries(statusEntries) {
    updateData({ ...data, statusEntries })
  }

  function setTasks(tasks) {
    updateData({ ...data, tasks })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8 flex flex-col gap-4 rounded-xl border border-white bg-white/70 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-teal-700">
            Geschützter Bereich
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">
            Internes Dashboard
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Statusmeldungen, interne Aufgaben, Erinnerungen und Backup-Daten werden
            lokal im Browser gespeichert.
          </p>
        </div>
        <BackupTools data={data} updateData={updateData} />
      </section>

      <MetricsGrid metrics={metrics} />
      <ReminderPanel tasks={dueTasks} />

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <StatusManager
          statusEntries={data.statusEntries}
          setStatusEntries={setStatusEntries}
        />
        <TaskManager tasks={data.tasks} setTasks={setTasks} />
      </div>
    </main>
  )
}

function getDashboardMetrics(data) {
  const openTasks = data.tasks.filter((task) => !task.completed)

  return {
    openStatus: data.statusEntries.filter((entry) => entry.status !== 'Abgeschlossen')
      .length,
    urgentStatus: data.statusEntries.filter((entry) => entry.status === 'Dringend').length,
    dueSoon: openTasks.filter((task) => {
      const diff = daysUntil(task.dueDate)
      return diff >= 0 && diff <= 7
    }).length,
    overdue: openTasks.filter((task) => daysUntil(task.dueDate) < 0).length,
  }
}

function MetricsGrid({ metrics }) {
  const items = [
    { label: 'Offene Statuspunkte', value: metrics.openStatus, tone: 'slate' },
    { label: 'Dringende Punkte', value: metrics.urgentStatus, tone: 'rose' },
    { label: 'Fällig in 7 Tagen', value: metrics.dueSoon, tone: 'amber' },
    { label: 'Überfällig', value: metrics.overdue, tone: 'red' },
  ]

  const toneStyles = {
    slate: 'border-slate-200 bg-white text-slate-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    red: 'border-red-200 bg-red-50 text-red-950',
  }

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-xl border p-4 shadow-sm ${toneStyles[item.tone]}`}
        >
          <p className="text-sm font-semibold opacity-75">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold">{item.value}</p>
        </article>
      ))}
    </section>
  )
}

function ReminderPanel({ tasks }) {
  const [copied, setCopied] = useState(false)
  const emailText = createReminderEmail(tasks)
  const groupedTasks = useMemo(() => groupReminderTasks(tasks), [tasks])

  async function copyText() {
    await navigator.clipboard.writeText(emailText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-100 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-amber-950">
            Überfällige und fällige Erinnerungen
          </h3>
          <p className="mt-1 text-sm text-amber-900">
            {tasks.length === 0
              ? 'Aktuell sind keine offenen Aufgaben fällig.'
              : `${tasks.length} Aufgabe${tasks.length === 1 ? '' : 'n'} bereit für den manuellen Versand nach Schweden.`}
          </p>
        </div>
        <button
          type="button"
          onClick={copyText}
          disabled={tasks.length === 0}
          className="rounded-md bg-amber-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? 'Kopiert' : 'Kopieren für E-Mail'}
        </button>
      </div>
      {tasks.length > 0 && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <ReminderGroup title="Überfällig" tasks={groupedTasks.overdue} tone="red" />
          <ReminderGroup title="Heute fällig" tasks={groupedTasks.today} tone="amber" />
          <ReminderGroup
            title="Nächste 14 Tage"
            tasks={groupedTasks.upcoming}
            tone="slate"
          />
        </div>
      )}
    </section>
  )
}

function groupReminderTasks(tasks) {
  return tasks.reduce(
    (groups, task) => {
      const diff = daysUntil(task.dueDate)
      if (diff < 0) groups.overdue.push(task)
      else if (diff === 0) groups.today.push(task)
      else groups.upcoming.push(task)
      return groups
    },
    { overdue: [], today: [], upcoming: [] },
  )
}

function ReminderGroup({ title, tasks, tone }) {
  const toneStyles = {
    red: 'border-red-200 bg-red-50 text-red-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    slate: 'border-slate-200 bg-white text-slate-950',
  }

  return (
    <div className={`rounded-lg border p-3 ${toneStyles[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-bold">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm opacity-70">Keine Aufgaben.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskSummary key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskSummary({ task }) {
  return (
    <article className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-slate-950">{task.title}</h4>
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-950">
          {formatDate(task.dueDate)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Verantwortlich: {task.owner}</p>
      <p className="mt-1 text-sm text-slate-600">{task.reminderInterval}</p>
    </article>
  )
}

function createReminderEmail(tasks) {
  if (tasks.length === 0) return 'Keine offenen fälligen Erinnerungen.'

  return [
    'Hallo Schweden-Team,',
    '',
    'folgende Erinnerungen sind überfällig oder in den nächsten 14 Tagen fällig:',
    '',
    ...tasks.flatMap((task, index) => [
      `${index + 1}. ${task.title}`,
      `   Verantwortlich: ${task.owner}`,
      `   Fällig am: ${formatDate(task.dueDate)}`,
      `   Intervall: ${task.reminderInterval}`,
      task.notes ? `   Notizen: ${task.notes}` : '   Notizen: -',
      '',
    ]),
    'Viele Grüße',
  ].join('\n')
}

function StatusManager({ statusEntries, setStatusEntries }) {
  const [draft, setDraft] = useState(emptyStatusEntry)
  const [editingId, setEditingId] = useState(null)

  function saveEntry(event) {
    event.preventDefault()
    if (!draft.title.trim()) return

    if (editingId) {
      setStatusEntries(
        statusEntries.map((entry) =>
          entry.id === editingId ? { ...draft, id: editingId } : entry,
        ),
      )
    } else {
      setStatusEntries([{ ...draft, id: crypto.randomUUID() }, ...statusEntries])
    }
    setDraft({ ...emptyStatusEntry, updatedAt: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
  }

  function editEntry(entry) {
    setDraft(entry)
    setEditingId(entry.id)
  }

  function deleteEntry(id) {
    setStatusEntries(statusEntries.filter((entry) => entry.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-950">Experteneinträge</h3>
      <EntryForm
        draft={draft}
        setDraft={setDraft}
        onSubmit={saveEntry}
        editing={Boolean(editingId)}
        onCancel={() => {
          setDraft(emptyStatusEntry)
          setEditingId(null)
        }}
      />
      <div className="mt-6 space-y-3">
        {statusEntries.map((entry) => (
          <ManageRow
            key={entry.id}
            title={entry.title}
            meta={`${entry.category} · ${entry.status} · ${formatDate(entry.updatedAt)}`}
            onEdit={() => editEntry(entry)}
            onDelete={() => deleteEntry(entry.id)}
          />
        ))}
      </div>
    </section>
  )
}

function EntryForm({ draft, setDraft, onSubmit, editing, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4">
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
      </div>
      <Field label="Titel">
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Datum letzter Stand">
        <input
          type="date"
          value={draft.updatedAt}
          onChange={(event) => setDraft({ ...draft, updatedAt: event.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Beschreibung">
        <textarea
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          className={`${inputClass} min-h-28`}
        />
      </Field>
      <FormActions editing={editing} onCancel={onCancel} />
    </form>
  )
}

function TaskManager({ tasks, setTasks }) {
  const [draft, setDraft] = useState(emptyTask)
  const [editingId, setEditingId] = useState(null)

  function saveTask(event) {
    event.preventDefault()
    if (!draft.title.trim()) return

    if (editingId) {
      setTasks(tasks.map((task) => (task.id === editingId ? { ...draft, id: editingId } : task)))
    } else {
      setTasks([{ ...draft, id: crypto.randomUUID() }, ...tasks])
    }
    setDraft({ ...emptyTask, dueDate: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
  }

  function editTask(task) {
    setDraft(task)
    setEditingId(task.id)
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-950">Interne Aufgaben</h3>
      <TaskForm
        draft={draft}
        setDraft={setDraft}
        onSubmit={saveTask}
        editing={Boolean(editingId)}
        onCancel={() => {
          setDraft(emptyTask)
          setEditingId(null)
        }}
      />
      <div className="mt-6 space-y-3">
        {tasks.map((task) => (
          <TaskManageRow
            key={task.id}
            task={task}
            onToggle={() =>
              setTasks(
                tasks.map((item) =>
                  item.id === task.id ? { ...item, completed: !item.completed } : item,
                ),
              )
            }
            onEdit={() => editTask(task)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
      </div>
    </section>
  )
}

function TaskForm({ draft, setDraft, onSubmit, editing, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4">
      <Field label="Titel">
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className={inputClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Verantwortlich">
          <input
            value={draft.owner}
            onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Erinnerungsintervall">
          <select
            value={draft.reminderInterval}
            onChange={(event) =>
              setDraft({ ...draft, reminderInterval: event.target.value })
            }
            className={inputClass}
          >
            <option>einmalig</option>
            <option>monatlich wiederkehrend</option>
          </select>
        </Field>
        <Field label="Sichtbarkeit">
          <select
            value={draft.visibility}
            onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}
            className={inputClass}
          >
            <option>öffentlich</option>
            <option>nur intern</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={draft.completed}
          onChange={(event) => setDraft({ ...draft, completed: event.target.checked })}
          className="h-4 w-4 accent-teal-800"
        />
        Aufgabe ist erledigt
      </label>
      <Field label="Interne Notizen">
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          className={`${inputClass} min-h-28`}
        />
      </Field>
      <FormActions editing={editing} onCancel={onCancel} />
    </form>
  )
}

function BackupTools({ data, updateData }) {
  const inputRef = useRef(null)

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expertenstatus-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function importData(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!Array.isArray(parsed.statusEntries) || !Array.isArray(parsed.tasks)) return
        updateData(normalizeData(parsed))
      } catch {
        return
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportData}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        JSON Export
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-teal-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
      >
        JSON Import
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        onChange={importData}
        className="hidden"
      />
    </div>
  )
}

const inputClass =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100'

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

function ManageRow({ title, meta, onEdit, onDelete }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="font-semibold text-slate-950">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{meta}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
        >
          Löschen
        </button>
      </div>
    </article>
  )
}

function TaskManageRow({ task, onToggle, onEdit, onDelete }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4
            className={`font-semibold ${
              task.completed ? 'text-slate-500 line-through' : 'text-slate-950'
            }`}
          >
            {task.title}
          </h4>
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              task.completed
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-sky-100 text-sky-900'
            }`}
          >
            {task.completed ? 'Erledigt' : 'Offen'}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {task.owner || 'Ohne Verantwortliche'} · {formatDate(task.dueDate)} ·{' '}
          {task.visibility} · {task.reminderInterval}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          {task.completed ? 'Wieder öffnen' : 'Erledigt'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
        >
          Löschen
        </button>
      </div>
    </article>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-500">
      {text}
    </div>
  )
}

export default App
