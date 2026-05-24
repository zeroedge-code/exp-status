import { StatusBadge } from './StatusBadge.jsx'

export function StatusCard({ entry, badgeStatus, badgeLabel, meta, delay = 0 }) {
  return (
    <article
      className="card row-enter group grid gap-3 px-4 py-4 transition hover:bg-[var(--bg-elevated)] sm:grid-cols-[minmax(0,1fr)_auto_minmax(11rem,0.8fr)] sm:items-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`status-dot ${badgeStatus === 'available' ? 'status-dot-available' : ''}`}
          style={{ color: getStatusColor(badgeStatus) }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3 className="truncate text-[0.95rem] font-medium leading-6 text-[var(--text-primary)]">
            {entry.title}
          </h3>
          {meta && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{meta}</p>
          )}
        </div>
      </div>
      <StatusBadge status={badgeStatus} label={badgeLabel} />
      <p className="min-w-0 text-sm leading-6 text-[var(--text-secondary)] sm:text-right">
        {entry.description || 'Kein Hinweis hinterlegt'}
      </p>
    </article>
  )
}

function getStatusColor(status) {
  if (status === 'available') return 'var(--success)'
  if (status === 'busy') return 'var(--warning)'
  if (status === 'offline') return 'var(--danger)'
  return 'var(--text-muted)'
}
