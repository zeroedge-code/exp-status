import { useState } from 'react'
import { categories, defaultDisplaySettings, formatDate } from './statusData.js'

const statusFilterOptions = ['Alle', 'Offen', 'Neu', 'Erledigt']
const ownerFilterOptions = ['Operator', 'Techbuddy']

const statusConfig = {
  Offen: {
    key: 'offen',
    border: 'var(--color-warning)',
    color: 'var(--color-warning-text)',
    badgeBg: 'var(--color-warning-soft)',
    progress: 33,
    step: 'Schritt 1 von 3: Rückmeldung',
  },
  Neu: {
    key: 'neu',
    border: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    badgeBg: 'var(--color-accent-soft)',
    progress: 66,
    step: 'Schritt 2 von 3: Vorbereitung',
  },
  Erledigt: {
    key: 'erledigt',
    border: 'var(--color-success)',
    color: 'var(--color-success-text)',
    badgeBg: 'var(--color-success-soft)',
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
  settings = defaultDisplaySettings,
  intro = 'Alle aktuellen Themen, Aufgaben und Infos auf einen Blick.',
}) {
  const displaySettings = { ...defaultDisplaySettings, ...settings }
  const [activeFilter, setActiveFilter] = useState('alle')
  const latestUpdate = getLatestUpdate(statusEntries)
  const totalEntries = statusEntries.length
  const stats = ['Offen', 'Neu', 'Erledigt'].map((status) => ({
    status,
    count: statusEntries.filter((entry) => normalizeStatus(entry.status) === normalizeStatus(status)).length,
  }))

  const groupedEntries = categories.map((category) => {
    const entries = statusEntries.filter((entry) => entry.category === category)
    const visibleEntries = entries.filter((entry) => entryMatchesFilter(entry, activeFilter))
    return { category, entries, visibleEntries }
  })
  const openEntries = statusEntries.filter((entry) => normalizeStatus(entry.status) !== 'erledigt')
  const nextDueEntry = getNextDueEntry(openEntries)

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4">
      <header className="board-header sticky top-0 z-20 rounded-t-[var(--border-radius-lg)] px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-sm bg-[var(--color-accent)]" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight text-[var(--color-text-primary)]">
                  Statusmeldungen
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                  {latestUpdate ? `Stand: ${formatRelativeDate(latestUpdate)} · ${totalEntries} Einträge` : intro}
                </p>
              </div>
            </div>
            {displaySettings.showHeaderSummary && (
              <div className="hidden shrink-0 items-center gap-2 rounded border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] sm:inline-flex">
                <span className="font-mono text-[var(--color-text-primary)]">{openEntries.length}</span>
                offen
                {displaySettings.showNextDue && nextDueEntry && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      nächste Frist: {getDueText(getDueDate(nextDueEntry))}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {displaySettings.showStats && (
        <section className="pt-5">
          <div className="grid grid-cols-3 gap-2.5">
            {stats.map(({ status, count }) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(statusConfig[status].key)}
                className={`status-stat-card status-stat-${statusConfig[status].key} rounded-[var(--border-radius-md)] border bg-[var(--color-background-primary)] px-3 py-3 text-center transition hover:border-[var(--color-border-secondary)] ${
                  activeFilter === statusConfig[status].key
                    ? 'border-[var(--color-border-secondary)] shadow-sm'
                    : 'border-[var(--color-border-tertiary)]'
                }`}
              >
                <span className="block font-mono text-2xl font-medium leading-none text-[var(--color-text-primary)]">
                  {count}
                </span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
                  {status}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {displaySettings.showFilters && (
        <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterGroup
            label="Status"
            options={statusFilterOptions}
            entries={statusEntries}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
          <FilterGroup
            label="Verantwortung"
            options={ownerFilterOptions}
            entries={statusEntries}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        </div>
      )}

      <div className="mt-5 space-y-5">
        {groupedEntries
          .filter(({ visibleEntries }) => visibleEntries.length > 0)
          .map(({ category, visibleEntries }) => (
            <section key={category}>
              {displaySettings.showCategories && (
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]">
                    <StatusIcon icon={categoryIcons[category] || 'ti-inbox'} />
                  </div>
                  <h2 className="flex-1 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
                    {category}
                  </h2>
                </div>
              )}
              <div className="grid gap-2 lg:grid-cols-2">
                {visibleEntries.map((entry) => (
                  <StatusCard
                    key={entry.id}
                    entry={entry}
                    showProgress={displaySettings.showProgress}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    </main>
  )
}

function StatusCard({ entry, showProgress }) {
  const status = normalizeKnownStatus(entry.status)
  const config = statusConfig[status]
  const owner = getOwner(entry)
  const type = getEntryType(entry)
  const priority = getPriority(entry)
  const dueDate = getDueDate(entry)
  const showDueDate = type !== 'info'
  const dueState = showDueDate ? getDueState(dueDate) : ''

  return (
    <article
      className="relative overflow-hidden rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-4 py-3.5 transition hover:border-[var(--color-border-secondary)]"
      data-status={config.key}
      data-owner={owner.key}
    >
      <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: getStripeColor(status, priority, type) }} />
      <div className="pl-2">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="flex-1 text-base font-semibold leading-snug text-[var(--color-text-primary)]">
            {entry.title}
          </h3>
          <div className="flex shrink-0 justify-end">
            <Badge background={config.badgeBg} color={config.color}>
              {status}
            </Badge>
          </div>
        </div>
        {type !== 'info' && priority && (
          <div className="mb-2">
            <PriorityBadge priority={priority} />
          </div>
        )}
        <p className="mb-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          {entry.description}
        </p>
        {showProgress && type === 'process' && <ProgressBar config={config} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {showDueDate && (
              <span className={`font-mono text-xs font-medium ${getDueClass(dueState)}`}>
                {getDueText(dueDate)}
              </span>
            )}
            <span className="text-xs text-[var(--color-text-secondary)]">
              {capitalize(formatRelativeUpdated(entry.updatedAt))} aktualisiert
            </span>
          </div>
          <div className={`inline-flex w-fit items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${getOwnerClass(owner.key)}`}>
            <div className="h-1.5 w-1.5 rounded-full bg-current" />
            {owner.label}
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterGroup({ label, options, entries, activeFilter, setActiveFilter }) {
  return (
    <div className="flex w-max items-center gap-2 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] p-1">
      <span className="pl-2 pr-1 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
        {label}
      </span>
      {options.map((filter) => {
        const filterKey = filter.toLowerCase()
        const isActive = activeFilter === filterKey
        return (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filterKey)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2.5 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-transparent bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border-tertiary)] hover:bg-[var(--color-background-primary)]'
            }`}
          >
            {filter}
            <span className={`rounded px-1.5 py-0.5 font-mono text-xs ${
              isActive ? 'bg-black/20 text-white' : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)]'
            }`}>
              {getFilterCount(entries, filterKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ProgressBar({ config }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-[var(--color-text-tertiary)]">
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
      ? { background: 'var(--color-danger-soft)', color: 'var(--color-danger-text)' }
      : { background: 'var(--color-warning-soft)', color: 'var(--color-warning-text)' }

  return <Badge {...style}>{priority}</Badge>
}

function Badge({ background, color, children }) {
  return (
    <span
      className="inline-flex items-center rounded-[var(--border-radius-md)] border px-2 py-1 text-xs font-medium"
      style={{ background, color, borderColor: 'var(--color-badge-border)' }}
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

function getNextDueEntry(entries) {
  return entries
    .filter((entry) => getEntryType(entry) !== 'info')
    .map((entry) => ({ entry, dueDate: getDueDate(entry) }))
    .filter(({ dueDate }) => Number.isFinite(dueDate.getTime()))
    .sort((first, second) => first.dueDate - second.dueDate)[0]?.entry
}

function entryMatchesFilter(entry, activeFilter) {
  if (activeFilter === 'alle') return true
  return normalizeStatus(entry.status) === activeFilter || getOwner(entry).key === activeFilter
}

function getFilterCount(entries, filterKey) {
  if (filterKey === 'alle') return entries.length
  return entries.filter((entry) => entryMatchesFilter(entry, filterKey)).length
}

function normalizeKnownStatus(status) {
  if (status === 'Erledigt') return 'Erledigt'
  if (status === 'Neu') return 'Neu'
  return 'Offen'
}

function normalizeStatus(status) {
  return normalizeKnownStatus(status).toLowerCase()
}

function getEntryType(entry) {
  if (entry.type === 'process') return 'process'
  if (entry.type === 'task') return 'task'
  if (entry.showProgress) return 'process'
  return 'info'
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

function getStripeColor(status, priority, type) {
  if (status === 'Erledigt') return 'var(--color-success)'
  if (type === 'info') return 'var(--color-accent)'
  if (priority === 'Hohe Priorität') return 'var(--color-danger)'
  if (priority === 'Mittlere Priorität') return 'var(--color-warning)'
  return statusConfig[status].border
}

function getOwnerClass(ownerKey) {
  if (ownerKey === 'techbuddy') {
    return 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]'
  }
  return 'border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]'
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

function getDueState(date) {
  const daysUntil = getDaysUntil(date)
  if (daysUntil < 0) return 'overdue'
  if (daysUntil === 0) return 'today'
  if (daysUntil <= 5) return 'soon'
  return 'future'
}

function getDueClass(state) {
  const styles = {
    overdue: 'text-[var(--color-danger)]',
    today: 'text-[var(--color-warning-text)]',
    soon: 'text-[var(--color-text-secondary)]',
    future: 'text-[var(--color-text-secondary)]',
  }
  return styles[state] || styles.future
}

function getDueText(date) {
  const daysUntil = getDaysUntil(date)
  if (daysUntil < 0) return 'Überfällig'
  if (daysUntil === 0) return 'Heute'
  if (daysUntil === 1) return 'Morgen'
  if (daysUntil <= 30) return `in ${daysUntil} Tagen`
  return formatDate(toDateInputValue(date))
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
