/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

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

const initialStatusEntries = [
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
]

function normalizeStatusEntries(rawData) {
  if (!Array.isArray(rawData?.statusEntries)) return initialStatusEntries

  return rawData.statusEntries.map((entry) => ({
    ...entry,
    category: categoryMigration[entry.category] || entry.category,
  }))
}

async function fetchStatusEntries() {
  const response = await fetch('/api/status', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Statusdaten konnten nicht geladen werden.')
  return normalizeStatusEntries(await response.json())
}

function formatDate(dateValue) {
  if (!dateValue) return 'Kein Datum'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`))
}

function StatusApp() {
  const [statusEntries, setStatusEntries] = useState(initialStatusEntries)
  const [hasSyncError, setHasSyncError] = useState(false)

  useEffect(() => {
    let active = true
    fetchStatusEntries()
      .then((entries) => {
        if (!active) return
        setStatusEntries(entries)
        setHasSyncError(false)
      })
      .catch(() => {
        if (!active) return
        setHasSyncError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <p className="text-xs font-bold uppercase text-teal-700">
            Expertenstatus
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Status & Erinnerungen
          </h1>
        </div>
      </header>
      {hasSyncError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="mx-auto max-w-7xl">
            Zentrale Statusdaten sind nicht erreichbar.
          </div>
        </div>
      )}
      <StatusPage statusEntries={statusEntries} />
    </div>
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

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-500">
      {text}
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StatusApp />
  </StrictMode>,
)
