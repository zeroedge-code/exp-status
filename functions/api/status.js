const STORE_KEY = 'status-data'

const categories = [
  'Auszahlungen & Vergütung',
  'Marketing & Sichtbarkeit',
  'Termine & Koordination',
  'Weitere Themen',
]

const categoryMigration = {
  'Finanzierung & Bank': 'Auszahlungen & Vergütung',
  'Finanzen & Expertenzahlungen': 'Auszahlungen & Vergütung',
  Marketing: 'Marketing & Sichtbarkeit',
  Organisation: 'Termine & Koordination',
  'Abstimmung & Organisation': 'Termine & Koordination',
  Sonstiges: 'Weitere Themen',
}

const statusOptions = ['Neu', 'Dringend', 'Offen', 'Erledigt']
const ownerOptions = ['Operator', 'Techbuddy']
const typeOptions = ['info', 'task', 'process']
const priorityOptions = ['Mittlere Priorität', 'Hohe Priorität', '']

const defaultSettings = {
  showHeaderSummary: true,
  showNextDue: true,
  showStats: true,
  showFilters: true,
  showCategories: true,
  showProgress: true,
}

const statusMigration = {
  'Antwort ausstehend': 'Offen',
  'In Bearbeitung': 'Offen',
  Abgeschlossen: 'Erledigt',
}

const reminderIntervals = ['einmalig', 'monatlich wiederkehrend']
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const defaultData = {
  statusEntries: [
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
  ],
  settings: defaultSettings,
  tasks: [],
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  })
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeCategory(category) {
  return categoryMigration[category] || category
}

function normalizeStatus(status) {
  return statusMigration[status] || status
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function inferOwner(entry, status) {
  if (entry.category === 'Marketing' || entry.category === 'Marketing & Sichtbarkeit' || status === 'Neu') {
    return 'Techbuddy'
  }
  return 'Operator'
}

function inferPriority(status) {
  if (status === 'Erledigt') return ''
  if (status === 'Dringend') return 'Hohe Priorität'
  return 'Mittlere Priorität'
}

function inferType(entry) {
  if (entry.showProgress) return 'process'
  if (entry.priority || entry.dueDate) return 'task'
  return 'info'
}

function inferDueDate(entry, status) {
  const dateValue = entry.updatedAt || entry.createdAt
  if (!isValidDateString(dateValue)) return ''
  const date = new Date(`${dateValue}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + (status === 'Erledigt' ? 0 : 7))
  return date.toISOString().slice(0, 10)
}

function normalizeStatusEntry(entry) {
  if (!isRecord(entry)) return null
  const status = normalizeStatus(entry.status)

  const normalized = {
    id: cleanString(entry.id),
    category: normalizeCategory(entry.category),
    title: cleanString(entry.title),
    status,
    owner: ownerOptions.includes(entry.owner) ? entry.owner : inferOwner(entry, status),
    type: typeOptions.includes(entry.type) ? entry.type : inferType(entry),
    priority: priorityOptions.includes(entry.priority) ? entry.priority : inferPriority(status),
    showProgress: entry.type === 'process' || Boolean(entry.showProgress),
    createdAt: entry.createdAt || entry.updatedAt,
    updatedAt: entry.updatedAt,
    dueDate: entry.dueDate || inferDueDate(entry, status),
    description: cleanString(entry.description),
  }

  if (
    !normalized.id ||
    !categories.includes(normalized.category) ||
    !normalized.title ||
    !statusOptions.includes(normalized.status) ||
    !ownerOptions.includes(normalized.owner) ||
    !typeOptions.includes(normalized.type) ||
    !priorityOptions.includes(normalized.priority) ||
    !isValidDateString(normalized.createdAt) ||
    !isValidDateString(normalized.updatedAt) ||
    !isValidDateString(normalized.dueDate)
  ) {
    return null
  }

  return normalized
}

function normalizeTask(task) {
  if (!isRecord(task)) return null

  const normalized = {
    id: cleanString(task.id),
    title: cleanString(task.title),
    owner: cleanString(task.owner),
    dueDate: task.dueDate,
    reminderInterval: task.reminderInterval,
    notes: cleanString(task.notes),
    completed: Boolean(task.completed),
  }

  if (
    !normalized.id ||
    !normalized.title ||
    !isValidDateString(normalized.dueDate) ||
    !reminderIntervals.includes(normalized.reminderInterval)
  ) {
    return null
  }

  return normalized
}

function normalizeSettings(settings) {
  if (!isRecord(settings)) return defaultSettings

  return Object.fromEntries(
    Object.entries(defaultSettings).map(([key, fallback]) => [
      key,
      typeof settings[key] === 'boolean' ? settings[key] : fallback,
    ]),
  )
}

function normalizeData(rawData) {
  return {
    statusEntries: Array.isArray(rawData?.statusEntries)
      ? rawData.statusEntries.map(normalizeStatusEntry).filter(Boolean)
      : [],
    settings: normalizeSettings(rawData?.settings),
    tasks: Array.isArray(rawData?.tasks)
      ? rawData.tasks.map(normalizeTask).filter(Boolean)
      : [],
  }
}

function validateData(rawData) {
  const errors = []

  if (!isRecord(rawData)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] }
  }

  if (!Array.isArray(rawData.statusEntries)) {
    errors.push('statusEntries must be an array.')
  } else {
    rawData.statusEntries.forEach((entry, index) => {
      if (!normalizeStatusEntry(entry)) {
        errors.push(`statusEntries[${index}] is invalid.`)
      }
    })
  }

  if (!Array.isArray(rawData.tasks)) {
    errors.push('tasks must be an array.')
  } else {
    rawData.tasks.forEach((task, index) => {
      if (!normalizeTask(task)) {
        errors.push(`tasks[${index}] is invalid.`)
      }
    })
  }

  if (rawData.settings !== undefined && !isRecord(rawData.settings)) {
    errors.push('settings must be an object.')
  } else if (isRecord(rawData.settings)) {
    Object.keys(defaultSettings).forEach((key) => {
      if (rawData.settings[key] !== undefined && typeof rawData.settings[key] !== 'boolean') {
        errors.push(`settings.${key} must be a boolean.`)
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

async function readJson(request) {
  try {
    return { data: await request.json() }
  } catch {
    return { error: 'Request body must be valid JSON.' }
  }
}

async function readData(env) {
  if (!env.STATUS_STORE) {
    return { error: 'Missing STATUS_STORE KV binding.' }
  }

  const stored = await env.STATUS_STORE.get(STORE_KEY, 'json')
  if (!stored) {
    await env.STATUS_STORE.put(STORE_KEY, JSON.stringify(defaultData))
    return defaultData
  }

  return normalizeData(stored)
}

export async function onRequestGet({ env }) {
  const data = await readData(env)
  if (data.error) {
    return jsonResponse({ error: data.error }, { status: 500 })
  }

  return jsonResponse(data)
}

export async function onRequestPut({ request, env }) {
  if (env.APP_TARGET !== 'admin') {
    return jsonResponse({ error: 'Writes are only allowed from the admin app.' }, { status: 403 })
  }

  if (!env.STATUS_STORE) {
    return jsonResponse({ error: 'Missing STATUS_STORE KV binding.' }, { status: 500 })
  }

  const parsed = await readJson(request)
  if (parsed.error) {
    return jsonResponse({ error: parsed.error }, { status: 400 })
  }

  const validation = validateData(parsed.data)
  if (!validation.valid) {
    return jsonResponse(
      { error: 'Invalid status data.', details: validation.errors },
      { status: 400 },
    )
  }

  const nextData = normalizeData(parsed.data)
  await env.STATUS_STORE.put(STORE_KEY, JSON.stringify(nextData))

  return jsonResponse(nextData)
}
