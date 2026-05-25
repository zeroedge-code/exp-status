export const categories = [
  'Auszahlungen & Vergütung',
  'Marketing & Sichtbarkeit',
  'Termine & Koordination',
  'Website & Updates',
  'Weitere Themen',
]

export const categoryMigration = {
  'Finanzierung & Bank': 'Auszahlungen & Vergütung',
  'Finanzen & Expertenzahlungen': 'Auszahlungen & Vergütung',
  Marketing: 'Marketing & Sichtbarkeit',
  Organisation: 'Termine & Koordination',
  'Abstimmung & Organisation': 'Termine & Koordination',
  'Website Updates': 'Website & Updates',
  'Webseiten & Neuerungen': 'Website & Updates',
  Webseiten: 'Website & Updates',
  Neuerungen: 'Website & Updates',
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

export const defaultStatusEntries = [
  {
    id: 'status-payment-documents',
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
    id: 'status-campaign-material',
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
    id: 'status-expert-schedule',
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
