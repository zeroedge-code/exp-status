import { categories, formatDate } from './statusData.js'

export function StatusPage({
  statusEntries,
  intro = 'Alle aktuellen Themen, Aufgaben und Infos auf einen Blick.',
}) {
  const groupedEntries = categories.map((category) => ({
    category,
    entries: statusEntries.filter((entry) => entry.category === category),
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8 rounded-xl border border-white bg-white/70 p-6 shadow-sm">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-teal-700">
            Für alle Experten
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">
            Was gerade wichtig ist
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">{intro}</p>
        </div>
      </section>

      <div className="space-y-8">
        {groupedEntries.map(({ category, entries }) => (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">{category}</h3>
              <span className="text-sm text-slate-500">
                {entries.length === 0 ? 'Keine Einträge' : `${entries.length} Einträge`}
              </span>
            </div>
            {entries.length === 0 ? (
              <EmptyState text="Aktuell nichts Neues – schau später wieder vorbei." />
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
    Neu: 'border-l-sky-500',
    Offen: 'border-l-amber-500',
    Erledigt: 'border-l-emerald-500',
    'Antwort ausstehend': 'border-l-sky-500',
    'In Bearbeitung': 'border-l-indigo-500',
    Abgeschlossen: 'border-l-emerald-500',
    Dringend: 'border-l-rose-500',
  }

  return (
    <article
      className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderStyles[entry.status] || 'border-l-slate-300'}`}
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
        Letzter Stand:<span className="ml-1 font-medium">{formatDate(entry.updatedAt)}</span>
      </p>
    </article>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Neu: 'bg-sky-100 text-sky-900 ring-sky-200',
    Offen: 'bg-amber-100 text-amber-900 ring-amber-200',
    Erledigt: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    'Antwort ausstehend': 'bg-sky-100 text-sky-900 ring-sky-200',
    'In Bearbeitung': 'bg-indigo-100 text-indigo-900 ring-indigo-200',
    Abgeschlossen: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    Dringend: 'bg-rose-100 text-rose-900 ring-rose-200',
  }

  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-3 py-1 text-xs font-bold ring-1 ${styles[status] || 'bg-slate-100 text-slate-800 ring-slate-200'}`}
    >
      {status}
    </span>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-500">
      {text}
    </div>
  )
}
