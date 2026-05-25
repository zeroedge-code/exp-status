import { StatusBadge } from './StatusBadge.jsx'

export function StatusCard({ entry, badgeStatus, badgeLabel, meta, delay = 0, compact = false }) {
  const titleId = `status-card-title-${entry.id}`

  return (
    <article
      aria-labelledby={titleId}
      className={`card status-card row-enter group grid gap-3 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${
        compact ? 'status-card-compact' : ''
      } ${badgeStatus === 'away' ? 'status-card-done' : ''}`}
      style={{ animationDelay: `${delay}ms`, '--status-accent': getAccentColor(entry, badgeStatus) }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`status-dot ${badgeStatus === 'available' ? 'status-dot-available' : ''}`}
          style={{ color: getStatusColor(badgeStatus) }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3 id={titleId} className="text-[0.98rem] font-semibold leading-6 text-[var(--text-primary)]">
            {entry.title}
          </h3>
          {meta && <CardMeta meta={meta} />}
        </div>
      </div>
      <StatusBadge status={badgeStatus} label={badgeLabel} />
      <p className="status-card-description min-w-0 text-sm leading-6 text-[var(--text-secondary)] sm:col-span-2 sm:pl-6">
        {entry.description || 'Kein Hinweis hinterlegt'}
      </p>
    </article>
  )
}

function CardMeta({ meta }) {
  if (typeof meta === 'string') {
    return <p className="mt-1 text-xs text-[var(--text-muted)]">{meta}</p>
  }

  return (
    <p className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1 text-xs text-[var(--text-muted)]">
      <span>{meta.owner}</span>
      <span aria-hidden="true">·</span>
      <span>{meta.updated}</span>
      <span aria-hidden="true">·</span>
      <span className={meta.overdue ? 'font-medium text-[var(--danger)]' : 'text-[var(--text-secondary)]'}>
        {meta.due}
      </span>
    </p>
  )
}

function getStatusColor(status) {
  if (status === 'urgent') return 'var(--danger)'
  if (status === 'available') return 'var(--success)'
  if (status === 'busy') return 'var(--warning)'
  if (status === 'offline') return 'var(--danger)'
  return 'var(--text-muted)'
}

function getAccentColor(entry, badgeStatus) {
  if (entry.status === 'Dringend' || entry.priority === 'Hohe Priorität') return 'var(--danger)'
  if (badgeStatus === 'urgent') return 'var(--danger)'
  if (badgeStatus === 'available') return 'var(--success)'
  if (badgeStatus === 'busy') return 'var(--warning)'
  return 'var(--border)'
}
