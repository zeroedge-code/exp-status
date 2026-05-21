export const categories = [
  'Finanzen & Expertenzahlungen',
  'Marketing',
  'Abstimmung & Organisation',
  'Sonstiges',
]

export const categoryMigration = {
  'Finanzierung & Bank': 'Finanzen & Expertenzahlungen',
  Organisation: 'Abstimmung & Organisation',
}

export const statusOptions = [
  'Antwort ausstehend',
  'In Bearbeitung',
  'Abgeschlossen',
  'Dringend',
]

export function createInitialStatusEntries() {
  return [
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
}

export function normalizeStatusEntries(rawData, fallbackEntries = createInitialStatusEntries()) {
  if (!Array.isArray(rawData?.statusEntries)) return fallbackEntries

  return rawData.statusEntries.map((entry) => ({
    ...entry,
    category: categoryMigration[entry.category] || entry.category,
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
