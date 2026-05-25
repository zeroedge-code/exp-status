const statusMeta = {
  urgent: {
    color: 'var(--danger)',
    background: 'var(--color-danger-soft)',
  },
  available: {
    color: 'var(--success)',
    background: 'var(--color-success-soft)',
  },
  busy: {
    color: 'var(--warning)',
    background: 'var(--color-warning-soft)',
  },
  away: {
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
  },
  offline: {
    color: 'var(--danger)',
    background: 'var(--color-danger-soft)',
  },
}

export function StatusBadge({ status = 'away', label }) {
  const meta = statusMeta[status] || statusMeta.away

  return (
    <span
      className="badge transition-colors duration-[400ms]"
      style={{ color: meta.color, background: meta.background }}
    >
      <span
        className={`status-dot ${status === 'available' ? 'status-dot-available' : ''}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}
