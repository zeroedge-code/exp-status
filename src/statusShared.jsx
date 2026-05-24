import { useMemo, useState } from 'react'
import { StatusPill } from './components/StatusPill.jsx'
import { StatusCard } from './components/StatusCard.jsx'
import { SkeletonRow } from './components/SkeletonRow.jsx'
import { categories, defaultDisplaySettings, formatDate } from './statusData.js'

const statusFilterOptions = ['Alle', 'Offen', 'Neu', 'Erledigt']
const ownerFilterOptions = ['Operator', 'Techbuddy']

const statusConfig = {
  Offen: {
    key: 'busy',
    filterKey: 'offen',
    label: 'BESCHÄFTIGT',
  },
  Neu: {
    key: 'available',
    filterKey: 'neu',
    label: 'VERFÜGBAR',
  },
  Erledigt: {
    key: 'away',
    filterKey: 'erledigt',
    label: 'ABWESEND',
  },
}

export function StatusPage({
  statusEntries,
  settings = defaultDisplaySettings,
  loading = false,
  intro = 'Alle aktuellen Themen, Aufgaben und Infos auf einen Blick.',
}) {
  const displaySettings = { ...defaultDisplaySettings, ...settings }
  const [activeFilter, setActiveFilter] = useState('alle')
  const latestUpdate = getLatestUpdate(statusEntries)
  const visibleEntries = statusEntries.filter((entry) => entryMatchesFilter(entry, activeFilter))
  const openEntries = statusEntries.filter((entry) => normalizeStatus(entry.status) !== 'erledigt')
  const nextDueEntry = getNextDueEntry(openEntries)
  const stats = useMemo(
    () => ({
      offen: statusEntries.filter((entry) => normalizeStatus(entry.status) !== 'erledigt').length,
      eintraege: statusEntries.length,
      naechsteFrist:
        displaySettings.showNextDue && nextDueEntry ? getDueText(getDueDate(nextDueEntry)) : null,
    }),
    [displaySettings.showNextDue, nextDueEntry, statusEntries],
  )

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header
          style={{
            background: 'white',
            borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '20px 24px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  background: '#dbeafe',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ChartBarIcon />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Expertenstatus
                </h1>
                <span className="sr-only">Statusmeldungen</span>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  Aktueller Überblick aller Themen und Aufgaben
                </p>
              </div>
            </div>

            <StatusPill
              lastUpdated={latestUpdate}
              isLoading={loading}
              showAge={displaySettings.showLiveAge}
            />
          </div>

          {displaySettings.showHeaderSummary && (
            <>
              <div style={{ height: '0.5px', background: 'var(--border)' }} />
              <div
                style={{
                  padding: '12px 24px',
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.offen}
                  </span>{' '}
                  Offen
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.eintraege}
                  </span>{' '}
                  Einträge
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Nächste Frist:{' '}
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.naechsteFrist ?? 'Keine'}
                  </span>
                </span>
              </div>
            </>
          )}
          <div hidden>{intro}</div>
          <div hidden>{latestUpdate ? formatDate(toDateInputValue(latestUpdate)) : 'Wird geladen'}</div>
        </header>

        {displaySettings.showFilters && (
          <div className="-mx-4 mb-5 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterGroup
              label="Status"
              options={statusFilterOptions}
              entries={statusEntries}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
            <FilterGroup
              label="Team"
              options={ownerFilterOptions}
              entries={statusEntries}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
          </div>
        )}

        {loading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((index) => (
              <SkeletonRow key={index} delay={index * 60} />
            ))}
          </div>
        ) : visibleEntries.length > 0 ? (
          <div className="grid gap-2">
            {displaySettings.showCategories
              ? categories.map((category) => {
                  const entries = visibleEntries.filter((entry) => entry.category === category)
                  if (entries.length === 0) return null
                  return (
                    <section key={category} className="grid gap-2">
                      <div className="mt-4 flex items-center gap-3 first:mt-0">
                        <h2 className="label">{category}</h2>
                        <div className="divider flex-1" />
                      </div>
                      {entries.map((entry, index) => (
                        <StatusCard
                          key={entry.id}
                          entry={entry}
                          badgeStatus={getBadgeStatus(entry.status)}
                          badgeLabel={getBadgeLabel(entry.status)}
                          meta={`${getOwner(entry).label} · ${formatRelativeUpdated(entry.updatedAt)} aktualisiert`}
                          delay={index * 60}
                        />
                      ))}
                    </section>
                  )
                })
              : visibleEntries.map((entry, index) => (
                  <StatusCard
                    key={entry.id}
                    entry={entry}
                    badgeStatus={getBadgeStatus(entry.status)}
                    badgeLabel={getBadgeLabel(entry.status)}
                    meta={`${getOwner(entry).label} · ${formatRelativeUpdated(entry.updatedAt)} aktualisiert`}
                    delay={index * 60}
                  />
                ))}
          </div>
        ) : (
          <div className="card px-5 py-8 text-center">
            <p className="font-display text-sm text-[var(--text-primary)]">Keine Einträge</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Für den aktuellen Filter liegen keine Statusmeldungen vor.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function FilterGroup({ label, options, entries, activeFilter, setActiveFilter }) {
  return (
    <div className="flex w-max items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
      <span className="label px-2">{label}</span>
      {options.map((filter) => {
        const filterKey = filter.toLowerCase()
        const isActive = activeFilter === filterKey
        return (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filterKey)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-medium ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
            }`}
          >
            {filter}
            <span className={isActive ? 'font-display text-white/80' : 'font-display text-[var(--text-muted)]'}>
              {getFilterCount(entries, filterKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ChartBarIcon() {
  return (
    <svg
      aria-hidden="true"
      style={{ width: '18px', height: '18px', color: 'var(--accent)' }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
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

function getBadgeStatus(status) {
  return statusConfig[normalizeKnownStatus(status)]?.key || 'offline'
}

function getBadgeLabel(status) {
  return statusConfig[normalizeKnownStatus(status)]?.label || 'OFFLINE'
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

function getDueDate(entry) {
  const explicitDate = Date.parse(`${entry.dueDate}T00:00:00`)
  if (Number.isFinite(explicitDate)) return new Date(explicitDate)

  const baseDate = Date.parse(`${entry.updatedAt || entry.createdAt}T00:00:00`)
  const date = Number.isFinite(baseDate) ? new Date(baseDate) : new Date()
  date.setDate(date.getDate() + (normalizeKnownStatus(entry.status) === 'Erledigt' ? 0 : 7))
  return date
}

function getDueText(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  const daysUntil = Math.ceil((compareDate - today) / 86400000)

  if (daysUntil < 0) return 'Überfällig'
  if (daysUntil === 0) return 'Heute'
  if (daysUntil === 1) return 'Morgen'
  if (daysUntil <= 30) return `in ${daysUntil} Tagen`
  return formatDate(toDateInputValue(date))
}

function formatRelativeUpdated(dateValue) {
  const timestamp = Date.parse(`${dateValue}T00:00:00`)
  if (!Number.isFinite(timestamp)) return 'ohne Datum'
  return formatDistance(new Date(timestamp))
}

function formatDistance(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - compareDate) / 86400000)

  if (diffDays === 0) return 'heute aktualisiert'
  if (diffDays === 1) return 'vor 1 Tag'
  if (diffDays > 1) return `vor ${diffDays} Tagen`
  if (diffDays === -1) return 'morgen'
  return `in ${Math.abs(diffDays)} Tagen`
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10)
}
