export {
  categories,
  categoryMigration,
  defaultDisplaySettings,
  ownerOptions,
  priorityOptions,
  statusMigration,
  statusOptions,
  typeOptions,
} from './statusSchema.js'

import {
  categoryMigration,
  defaultDisplaySettings,
  defaultStatusEntries,
  ownerOptions,
  priorityOptions,
  statusMigration,
  typeOptions,
} from './statusSchema.js'

export function createInitialStatusEntries() {
  return defaultStatusEntries.map((entry) => ({
    ...entry,
    id: crypto.randomUUID(),
  }))
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
