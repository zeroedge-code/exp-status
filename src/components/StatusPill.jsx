import { useEffect, useState } from 'react'

export function StatusPill({ lastUpdated, isLoading, showAge = false }) {
  const [now, setNow] = useState(() => lastUpdated?.getTime() ?? 0)

  useEffect(() => {
    if (!lastUpdated) return
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 0)
    return () => window.clearTimeout(timeoutId)
  }, [lastUpdated])

  if (isLoading || !lastUpdated) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: '6px',
          padding: '6px 10px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--text-muted)',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Wird geladen
        </span>
      </div>
    )
  }

  const minutesAgo = Math.floor((now - lastUpdated.getTime()) / 60000)
  const label = minutesAgo < 1 ? 'Gerade eben' : `vor ${minutesAgo} Min.`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: '#f0fdf4',
        border: '0.5px solid #bbf7d0',
        borderRadius: '6px',
        padding: '6px 10px',
        flexShrink: 0,
      }}
    >
      <div className="status-dot-available" style={{ position: 'relative', width: '7px', height: '7px' }}>
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--success)',
          }}
        />
      </div>
      <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>Aktuell</span>
      {showAge && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>· {label}</span>
      )}
    </div>
  )
}
