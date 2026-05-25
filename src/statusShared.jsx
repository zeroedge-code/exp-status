import { useMemo, useState } from 'react'
import { StatusPill } from './components/StatusPill.jsx'
import { StatusCard } from './components/StatusCard.jsx'
import { SkeletonRow } from './components/SkeletonRow.jsx'
import { categories, defaultDisplaySettings, formatDate } from './statusData.js'

const statusFilterOptions = ['Alle', 'Dringend', 'Offen', 'Neu', 'Erledigt']
const ownerFilterOptions = ['Operator', 'Techbuddy']

const statusConfig = {
  Dringend: {
    key: 'urgent',
    filterKey: 'dringend',
    label: 'DRINGEND',
  },
  Offen: {
    key: 'busy',
    filterKey: 'offen',
    label: 'IN BEARBEITUNG',
  },
  Neu: {
    key: 'available',
    filterKey: 'neu',
    label: 'NEU',
  },
  Erledigt: {
    key: 'away',
    filterKey: 'erledigt',
    label: 'ERLEDIGT',
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
  const visibleEntries = sortEntriesByRelevance(
    statusEntries.filter((entry) => entryMatchesFilter(entry, activeFilter)),
  )
  const openEntries = statusEntries.filter((entry) => normalizeStatus(entry.status) !== 'erledigt')
  const nextDueEntry = getNextDueEntry(openEntries)
  const stats = useMemo(
    () => ({
      dringend: statusEntries.filter((entry) => normalizeStatus(entry.status) === 'dringend').length,
      aktiv: statusEntries.filter((entry) => normalizeStatus(entry.status) !== 'erledigt').length,
      erledigt: statusEntries.filter((entry) => normalizeStatus(entry.status) === 'erledigt').length,
      eintraege: statusEntries.length,
      naechsteFrist:
        displaySettings.showNextDue && nextDueEntry ? getDueText(getDueDate(nextDueEntry)) : null,
    }),
    [displaySettings.showNextDue, nextDueEntry, statusEntries],
  )

  return (
    <main className="status-page min-h-screen px-4 py-6 sm:py-10">
      <div className="status-shell mx-auto">
        <header className="status-header mb-6">
          <div className="status-header-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div className="status-icon">
                <ChartBarIcon />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    margin: 0,
                    letterSpacing: 0,
                  }}
                >
                  Expertenstatus
                </h1>
                <span className="sr-only">Statusmeldungen</span>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '2px 0 0',
                  }}
                >
                  Aktueller Überblick aller Themen und Aufgaben
                </p>
              </div>
            </div>

            {displaySettings.showLiveStatusPill && (
              <StatusPill
                lastUpdated={latestUpdate}
                isLoading={loading}
                showAge={displaySettings.showLiveAge}
              />
            )}
          </div>

          {displaySettings.showHeaderSummary && (
            <>
              <div style={{ height: '0.5px', background: 'var(--border)' }} />
              <div className="status-summary">
                <span className="status-summary-item">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.dringend}
                  </span>{' '}
                  Dringend
                </span>
                <span className="status-summary-item">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.aktiv}
                  </span>{' '}
                  Aktiv
                </span>
                <span className="status-summary-item">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.eintraege}
                  </span>{' '}
                  Einträge
                </span>
                <span className="status-summary-item">
                  Nächste Frist:{' '}
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.naechsteFrist ?? 'Keine'}
                  </span>
                </span>
                <span className="status-summary-item">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {stats.erledigt}
                  </span>{' '}
                  Erledigt
                </span>
              </div>
            </>
          )}
          <div hidden>{intro}</div>
          <div hidden>{latestUpdate ? formatDate(toDateInputValue(latestUpdate)) : 'Wird geladen'}</div>
        </header>

        {displaySettings.showFilters && (
          <div className="status-toolbar">
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
        <p className="filter-status">
          {visibleEntries.length} von {statusEntries.length} Einträgen angezeigt
          {activeFilter !== 'alle' ? ` · Filter: ${getFilterLabel(activeFilter)}` : ''}
        </p>

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
                      <div className="category-heading">
                        <h2 className="label category-title">
                          {category}
                          <span className="category-count">{entries.length}</span>
                        </h2>
                        <div className="divider flex-1" />
                      </div>
                      {entries.map((entry, index) => (
                        <StatusCard
                          key={entry.id}
                          entry={entry}
                          badgeStatus={getBadgeStatus(entry.status)}
                          badgeLabel={getBadgeLabel(entry.status)}
                          meta={getCardMeta(entry)}
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
                    meta={getCardMeta(entry)}
                    delay={index * 60}
                  />
                ))}
          </div>
        ) : (
          <div className="card empty-state px-5 py-8 text-center">
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
    <div className="filter-group flex w-max items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
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

function sortEntriesByRelevance(entries) {
  return [...entries].sort((first, second) => {
    const statusDiff = getStatusRank(first) - getStatusRank(second)
    if (statusDiff !== 0) return statusDiff
    return getDueDate(first) - getDueDate(second)
  })
}

function getStatusRank(entry) {
  if (normalizeKnownStatus(entry.status) === 'Dringend' || entry.priority === 'Hohe Priorität') return 0
  if (normalizeKnownStatus(entry.status) === 'Neu') return 1
  if (normalizeKnownStatus(entry.status) === 'Offen') return 2
  return 3
}

function getFilterCount(entries, filterKey) {
  if (filterKey === 'alle') return entries.length
  return entries.filter((entry) => entryMatchesFilter(entry, filterKey)).length
}

function getFilterLabel(filterKey) {
  if (filterKey === 'techbuddy') return 'Techbuddy'
  if (filterKey === 'operator') return 'Operator'
  const knownOption = statusFilterOptions.find((option) => option.toLowerCase() === filterKey)
  return knownOption || filterKey
}

function normalizeKnownStatus(status) {
  if (status === 'Erledigt') return 'Erledigt'
  if (status === 'Neu') return 'Neu'
  if (status === 'Dringend') return 'Dringend'
  return 'Offen'
}

function normalizeStatus(status) {
  return normalizeKnownStatus(status).toLowerCase()
}

function getBadgeStatus(status) {
  return statusConfig[normalizeKnownStatus(status)]?.key || 'offline'
}

function getBadgeLabel(status) {
  return statusConfig[normalizeKnownStatus(status)]?.label || 'UNBEKANNT'
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

function getCardMeta(entry) {
  const dueDate = getDueDate(entry)
  return {
    owner: getOwner(entry).label,
    updated: `${formatRelativeUpdated(entry.updatedAt)} aktualisiert`,
    due: `Fällig: ${getDueText(dueDate)}`,
    overdue: isOverdue(dueDate) && normalizeKnownStatus(entry.status) !== 'Erledigt',
  }
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

function isOverdue(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate < today
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

  if (diffDays === 0) return 'heute'
  if (diffDays === 1) return 'vor 1 Tag'
  if (diffDays > 1) return `vor ${diffDays} Tagen`
  if (diffDays === -1) return 'morgen'
  return `in ${Math.abs(diffDays)} Tagen`
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10)
}
