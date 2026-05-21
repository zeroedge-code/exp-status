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
      createdAt: '2026-05-18',
      updatedAt: '2026-05-18',
      description:
        'Die eingereichten Unterlagen liegen zur Prüfung vor. Der nächste Stand wird nach Eingang der Rückmeldung ergänzt.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Marketing & Sichtbarkeit',
      title: 'Abstimmung Kampagnenmaterial',
      status: 'Neu',
      createdAt: '2026-05-20',
      updatedAt: '2026-05-20',
      description:
        'Entwürfe werden intern konsolidiert und anschließend für die Freigabe vorbereitet.',
    },
    {
      id: crypto.randomUUID(),
      category: 'Termine & Koordination',
      title: 'Terminplanung Expertenrunde',
      status: 'Erledigt',
      createdAt: '2026-05-16',
      updatedAt: '2026-05-16',
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
  }))
}

export function formatDate(dateValue) {
  if (!dateValue) return 'Kein Datum'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`))
}
