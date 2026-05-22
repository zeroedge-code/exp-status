import { useState } from 'react'
import { categories, formatDate } from './statusData.js'

const filterOptions = ['Alle', 'Offen', 'Neu', 'Erledigt', 'Operator', 'Techbuddy']

const statusConfig = {
  Offen: {
    key: 'offen',
    border: '#EF9F27',
    color: '#854F0B',
    iconBg: '#FAEEDA',
    badgeBg: '#FAEEDA',
    progress: 33,
    step: 'Schritt 1 von 3: Rückmeldung',
  },
  Neu: {
    key: 'neu',
    border: '#378ADD',
    color: '#185FA5',
    iconBg: '#E6F1FB',
    badgeBg: '#E6F1FB',
    progress: 66,
    step: 'Schritt 2 von 3: Vorbereitung',
  },
  Erledigt: {
    key: 'erledigt',
    border: '#1D9E75',
    color: '#0F6E56',
    iconBg: '#E1F5EE',
    badgeBg: '#E1F5EE',
    progress: 100,
    step: 'Schritt 3 von 3: Abgeschlossen',
  },
}

const categoryIcons = {
  'Auszahlungen & Vergütung': 'ti-cash',
  'Marketing & Sichtbarkeit': 'ti-speakerphone',
  'Termine & Koordination': 'ti-calendar-check',
  'Weitere Themen': 'ti-inbox',
}

export function StatusPage({
  statusEntries,
  intro = 'Alle aktuellen Themen, Aufgaben und Infos auf einen Blick.',
}) {
  const [activeFilter, setActiveFilter] = useState('alle')
  const latestUpdate = getLatestUpdate(statusEntries)
  const stats = ['Offen', 'Neu', 'Erledigt'].map((status) => ({
    status,
    count: statusEntries.filter((entry) => normalizeStatus(entry.status) === normalizeStatus(status)).length,
  }))

  const groupedEntries = categories.map((category) => {
    const entries = statusEntries.filter((entry) => entry.category === category)
    const visibleEntries = entries.filter((entry) => entryMatchesFilter(entry, activeFilter))
    return { category, entries, visibleEntries }
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] shadow-sm">
        <div className="grid h-1 grid-cols-3">
          <div className="bg-[#EF9F27]" />
          <div className="bg-[#378ADD]" />
          <div className="bg-[#1D9E75]" />
        </div>
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
              Statusmeldungen
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              {latestUpdate ? `Aktualisiert ${formatRelativeDate(latestUpdate)}` : intro}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-96">
            {stats.map(({ status, count }) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(statusConfig[status].key)}
                className="rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-3 text-left transition hover:border-[var(--color-border-secondary)]"
              >
                <span className="block text-2xl font-semibold leading-none" style={{ color: statusConfig[status].color }}>
                  {count}
                </span>
                <span className="mt-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const filterKey = filter.toLowerCase()
          const isActive = activeFilter === filterKey
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filterKey)}
              className={`rounded-[var(--border-radius-md)] px-3 py-1.5 text-sm transition ${
                isActive
                  ? 'border border-[var(--color-border-primary)] bg-[var(--color-background-secondary)] font-medium text-[var(--color-text-primary)]'
                  : 'border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
              }`}
            >
              {filter}
            </button>
          )
        })}
      </div>

      <div className="mt-8 space-y-8">
        {groupedEntries
          .filter(({ visibleEntries }) => visibleEntries.length > 0)
          .map(({ category, visibleEntries }) => (
            <section key={category}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                {category}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleEntries.map((entry) => (
                  <StatusCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </main>
  )
}

function StatusCard({ entry }) {
  const status = normalizeKnownStatus(entry.status)
  const config = statusConfig[status]
  const owner = getOwner(entry)
  const priority = getPriority(entry)
  const dueDate = getDueDate(entry)
  const dueSoon = getDaysUntil(dueDate) < 5

  return (
    <article
      className="card rounded-r-[var(--border-radius-lg)] border-[0.5px] border-l-[3px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4 shadow-sm transition hover:border-[var(--color-border-secondary)]"
      data-status={config.key}
      data-owner={owner.key}
      style={{ borderLeftColor: config.border, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
    >
      <div className="grid grid-cols-[36px_1fr] gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[var(--border-radius-md)]"
          style={{ background: config.iconBg, color: config.color }}
        >
          <StatusIcon icon={categoryIcons[entry.category] || 'ti-inbox'} />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {entry.category}
            </p>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {priority && <PriorityBadge priority={priority} />}
              <Badge background={config.badgeBg} color={config.color}>
                {status}
              </Badge>
            </div>
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--color-text-primary)]">
            {entry.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            {entry.description}
          </p>
          {entry.showProgress && <ProgressBar config={config} />}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
              <span className={dueSoon ? 'font-medium text-[#A32D2D]' : ''}>
                Fällig {formatDate(toDateInputValue(dueDate))}
              </span>
              <span>{capitalize(formatRelativeUpdated(entry.updatedAt))} aktualisiert</span>
            </div>
            <div className="owner inline-flex w-fit items-center gap-2 rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
              <div className="owner-dot h-2 w-2 rounded-full" style={{ background: config.border }} />
              {owner.label}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProgressBar({ config }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--color-text-tertiary)]">
        <span>Fortschritt</span>
        <span className="text-right">{config.step}</span>
      </div>
      <div className="h-1 rounded-sm bg-[var(--color-background-secondary)]">
        <div
          className="h-1 rounded-sm"
          style={{ width: `${config.progress}%`, background: config.border }}
        />
      </div>
    </div>
  )
}

function PriorityBadge({ priority }) {
  const style =
    priority === 'Hohe Priorität'
      ? { background: '#FCEBEB', color: '#A32D2D' }
      : { background: '#FAEEDA', color: '#633806' }

  return <Badge {...style}>{priority}</Badge>
}

function Badge({ background, color, children }) {
  return (
    <span
      className="inline-flex items-center rounded-[var(--border-radius-md)] px-2 py-1 text-xs font-medium"
      style={{ background, color }}
    >
      {children}
    </span>
  )
}

function StatusIcon({ icon }) {
  const paths = {
    'ti-cash': (
      <>
        <path d="M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
        <path d="M9 9V7a2 2 0 0 1 2-2h6" />
        <path d="M14 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        <path d="M17 13v2" />
      </>
    ),
    'ti-file-invoice': (
      <>
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M9 7h1" />
        <path d="M9 13h6" />
        <path d="M13 17h2" />
      </>
    ),
    'ti-speakerphone': (
      <>
        <path d="M18 8a3 3 0 0 1 0 6" />
        <path d="M10 8v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5" />
        <path d="M12 8l6-4v14l-6-4H6a2 2 0 0 1 0-4h6" />
      </>
    ),
    'ti-calendar-check': (
      <>
        <path d="M11.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M4 11h16" />
        <path d="m15 19 2 2 4-4" />
      </>
    ),
    'ti-inbox': (
      <>
        <path d="M4 4h16v12a2 2 0 0 1-2 2h-4l-2 3-2-3H6a2 2 0 0 1-2-2V4z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </>
    ),
  }

  return (
    <svg
      className={`ti ${icon} h-5 w-5`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon]}
    </svg>
  )
}

function getLatestUpdate(entries) {
  const timestamps = entries
    .map((entry) => Date.parse(`${entry.updatedAt}T00:00:00`))
    .filter(Number.isFinite)
  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps))
}

function entryMatchesFilter(entry, activeFilter) {
  if (activeFilter === 'alle') return true
  return normalizeStatus(entry.status) === activeFilter || getOwner(entry).key === activeFilter
}

function normalizeKnownStatus(status) {
  if (status === 'Erledigt') return 'Erledigt'
  if (status === 'Neu') return 'Neu'
  return 'Offen'
}

function normalizeStatus(status) {
  return normalizeKnownStatus(status).toLowerCase()
}

function getOwner(entry) {
  if (entry.owner === 'Operator' || entry.owner === 'Techbuddy') {
    return { key: entry.owner.toLowerCase(), label: entry.owner }
  }
  if (entry.category === 'Marketing & Sichtbarkeit' || entry.status === 'Neu') {
    return { key: 'techbuddy', label: 'Techbuddy' }
  }
  return { key: 'operator', label: 'Operator' }
}

function getPriority(entry) {
  const status = normalizeKnownStatus(entry.status)
  if (status === 'Erledigt') return null
  if (entry.priority === 'Hohe Priorität' || entry.priority === 'Mittlere Priorität') {
    return entry.priority
  }
  if (entry.status === 'Dringend' || getDaysUntil(getDueDate(entry)) < 5) return 'Hohe Priorität'
  return 'Mittlere Priorität'
}

function getDueDate(entry) {
  const explicitDate = Date.parse(`${entry.dueDate}T00:00:00`)
  if (Number.isFinite(explicitDate)) return new Date(explicitDate)

  const baseDate = Date.parse(`${entry.updatedAt || entry.createdAt}T00:00:00`)
  const date = Number.isFinite(baseDate) ? new Date(baseDate) : new Date()
  const daysToAdd = normalizeKnownStatus(entry.status) === 'Erledigt' ? 0 : 7
  date.setDate(date.getDate() + daysToAdd)
  return date
}

function getDaysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return Math.ceil((compareDate - today) / 86400000)
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10)
}

function formatRelativeDate(date) {
  return formatDistance(date, 'vor')
}

function formatRelativeUpdated(dateValue) {
  const timestamp = Date.parse(`${dateValue}T00:00:00`)
  if (!Number.isFinite(timestamp)) return 'ohne Datum'
  return formatDistance(new Date(timestamp), 'vor')
}

function formatDistance(date, prefix) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - compareDate) / 86400000)

  if (diffDays === 0) return 'heute'
  if (diffDays === 1) return `${prefix} 1 Tag`
  if (diffDays > 1) return `${prefix} ${diffDays} Tagen`
  if (diffDays === -1) return 'morgen'
  return `in ${Math.abs(diffDays)} Tagen`
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
