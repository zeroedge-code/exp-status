export const categories = [
  'Auszahlungen & Vergütung',
  'Marketing & Sichtbarkeit',
  'Termine & Koordination',
  'Weitere Themen',
]

export const categoryMigration = {
  'Finanzierung & Bank': 'Auszahlungen & Vergütung',
  'Finanzen & Expertenzahlungen': 'Auszahlungen & Vergütung',
  Marketing: 'Marketing & Sichtbarkeit',
  Organisation: 'Termine & Koordination',
  'Abstimmung & Organisation': 'Termine & Koordination',
  Sonstiges: 'Weitere Themen',
}

export const statusOptions = ['Neu', 'Dringend', 'Offen', 'Erledigt']
export const ownerOptions = ['Operator', 'Techbuddy']
export const priorityOptions = ['Mittlere Priorität', 'Hohe Priorität']
export const typeOptions = ['info', 'task', 'process']

export const defaultDisplaySettings = {
  showHeaderSummary: true,
  showNextDue: true,
  showStats: true,
  showFilters: true,
  showCategories: true,
  showProgress: true,
  showLiveStatusPill: true,
  showLiveAge: false,
}

export const statusMigration = {
  'Antwort ausstehend': 'Offen',
  'In Bearbeitung': 'Offen',
  Abgeschlossen: 'Erledigt',
}

export function createInitialStatusEntries() {
  return [
    {
      id: crypto.randomUUID(),
      category: 'Auszahlungen & Vergütung',
      title: 'Rückmeldung Zahlungsunterlagen',
      status: 'Offen',
      owner: 'Operator',
      type: 'task',
      priority: 'Hohe Priorität',
      showProgress: false,
      createdAt: '2026-05-18',
      updatedAt: '2026-05-18',
      dueDate: '2026-05-25',
      description:
        'Die eingereichten Unterlagen liegen zur Prüfung vor. Der nächste Stand wird nach Eingang der Rückmeldung ergänzt.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Marketing & Sichtbarkeit',
      title: 'Abstimmung Kampagnenmaterial',
      status: 'Neu',
      owner: 'Techbuddy',
      type: 'task',
      priority: 'Mittlere Priorität',
      showProgress: false,
      createdAt: '2026-05-20',
      updatedAt: '2026-05-20',
      dueDate: '2026-05-27',
      description:
        'Entwürfe werden intern konsolidiert und anschließend für die Freigabe vorbereitet.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Termine & Koordination',
      title: 'Terminplanung Expertenrunde',
      status: 'Erledigt',
      owner: 'Operator',
      type: 'info',
      priority: '',
      showProgress: false,
      createdAt: '2026-05-16',
      updatedAt: '2026-05-16',
      dueDate: '2026-05-16',
      description:
        'Die Terminserie ist bestätigt. Weitere Änderungen werden separat dokumentiert.',
    },
  ]
}

export function normalizeStatusEntries(rawData, fallbackEntries = createInitialStatusEntries()) {
  if (!Array.isArray(rawData?.statusEntries)) return fallbackEntries

  return rawData.statusEntries.map((entry) => ({
    ...entry,
    category: categoryMigration[entry.category] || entry.category,
    status: statusMigration[entry.status] || entry.status,
    createdAt: entry.createdAt || entry.updatedAt,
    owner: ownerOptions.includes(entry.owner) ? entry.owner : inferOwner(entry),
    type: typeOptions.includes(entry.type) ? entry.type : inferType(entry),
    priority: priorityOptions.includes(entry.priority) ? entry.priority : inferPriority(entry),
    showProgress: entry.type === 'process' || Boolean(entry.showProgress),
    dueDate: entry.dueDate || inferDueDate(entry),
  }))
}

export function normalizeDisplaySettings(rawData) {
  const settings = rawData?.settings
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return defaultDisplaySettings
  }

  return Object.fromEntries(
    Object.entries(defaultDisplaySettings).map(([key, fallback]) => [
      key,
      typeof settings[key] === 'boolean' ? settings[key] : fallback,
    ]),
  )
}

function inferType(entry) {
  if (entry.showProgress) return 'process'
  if (entry.priority || entry.dueDate) return 'task'
  return 'info'
}

function inferOwner(entry) {
  if (entry.category === 'Marketing' || entry.category === 'Marketing & Sichtbarkeit' || entry.status === 'Neu') {
    return 'Techbuddy'
  }
  return 'Operator'
}

function inferPriority(entry) {
  const status = statusMigration[entry.status] || entry.status
  if (status === 'Erledigt') return ''
  if (status === 'Dringend') return 'Hohe Priorität'
  return 'Mittlere Priorität'
}

function inferDueDate(entry) {
  const dateValue = entry.updatedAt || entry.createdAt
  if (!dateValue) return new Date().toISOString().slice(0, 10)
  const date = new Date(`${dateValue}T00:00:00Z`)
  const status = statusMigration[entry.status] || entry.status
  date.setUTCDate(date.getUTCDate() + (status === 'Erledigt' ? 0 : 7))
  return date.toISOString().slice(0, 10)
}

export function formatDate(dateValue) {
  if (!dateValue) return 'Kein Datum'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`))
}
