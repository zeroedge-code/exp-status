const STORE_KEY = 'status-data'

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

const statusOptions = [
  'Antwort ausstehend',
  'In Bearbeitung',
  'Abgeschlossen',
  'Dringend',
]

const reminderIntervals = ['einmalig', 'monatlich wiederkehrend']
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const defaultData = {
  statusEntries: [
    {
      id: 'status-payment-documents',
      category: 'Finanzen & Expertenzahlungen',
      title: 'Rückmeldung Zahlungsunterlagen',
      status: 'Antwort ausstehend',
      updatedAt: '2026-05-18',
      description:
        'Die eingereichten Unterlagen liegen zur Prüfung vor. Der nächste Stand wird nach Eingang der Rückmeldung ergänzt.',
    },
    {
      id: 'status-campaign-material',
      category: 'Marketing',
      title: 'Abstimmung Kampagnenmaterial',
      status: 'In Bearbeitung',
      updatedAt: '2026-05-20',
      description:
        'Entwürfe werden intern konsolidiert und anschließend für die Freigabe vorbereitet.',
    },
    {
      id: 'status-expert-schedule',
      category: 'Abstimmung & Organisation',
      title: 'Terminplanung Expertenrunde',
      status: 'Abgeschlossen',
      updatedAt: '2026-05-16',
      description:
        'Die Terminserie ist bestätigt. Weitere Änderungen werden separat dokumentiert.',
    },
  ],
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

function isValidDateString(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStatusEntry(entry) {
  if (!isRecord(entry)) return null

  const normalized = {
    id: cleanString(entry.id),
    category: normalizeCategory(entry.category),
    title: cleanString(entry.title),
    status: entry.status,
    updatedAt: entry.updatedAt,
    description: cleanString(entry.description),
  }

  if (
    !normalized.id ||
    !categories.includes(normalized.category) ||
    !normalized.title ||
    !statusOptions.includes(normalized.status) ||
    !isValidDateString(normalized.updatedAt)
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

function normalizeData(rawData) {
  return {
    statusEntries: Array.isArray(rawData?.statusEntries)
      ? rawData.statusEntries.map(normalizeStatusEntry).filter(Boolean)
      : [],
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
  if (!env.STATUS_STORE) return defaultData

  const stored = await env.STATUS_STORE.get(STORE_KEY, 'json')
  if (!stored) {
    await env.STATUS_STORE.put(STORE_KEY, JSON.stringify(defaultData))
    return defaultData
  }

  return normalizeData(stored)
}

export async function onRequestGet({ env }) {
  return jsonResponse(await readData(env))
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
