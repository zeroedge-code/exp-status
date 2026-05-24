import { expect, test } from 'vitest'
import { onRequestGet, onRequestPut } from './status.js'

function createStore(initialValue) {
  const values = new Map()
  if (initialValue !== undefined) {
    values.set('status-data', JSON.stringify(initialValue))
  }

  return {
    async get(key, type) {
      const value = values.get(key)
      if (value === undefined) return null
      return type === 'json' ? JSON.parse(value) : value
    },
    async put(key, value) {
      values.set(key, value)
    },
    values,
  }
}

function jsonRequest(body) {
  return new Request('https://example.com/api/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validData() {
  return {
    statusEntries: [
      {
        id: 'status-one',
        category: 'Finanzierung & Bank',
        title: 'Unterlagen',
        status: 'In Bearbeitung',
        owner: 'Operator',
        type: 'process',
        priority: 'Hohe Priorität',
        showProgress: true,
        createdAt: '2026-05-20',
        updatedAt: '2026-05-21',
        dueDate: '2026-05-28',
        description: 'Prüfung läuft.',
      },
    ],
    tasks: [
      {
        id: 'task-one',
        title: 'Rückfrage senden',
        owner: 'Team',
        dueDate: '2026-05-22',
        reminderInterval: 'einmalig',
        notes: 'Kurz prüfen.',
        completed: false,
      },
    ],
  }
}

test('GET returns default data and seeds KV when empty', async () => {
  const store = createStore()
  const response = await onRequestGet({ env: { STATUS_STORE: store } })
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.statusEntries).toHaveLength(3)
  expect(body.settings.showNextDue).toBe(true)
  expect(body.tasks).toHaveLength(0)
  expect(store.values.has('status-data')).toBe(true)
})

test('GET rejects missing KV binding', async () => {
  const response = await onRequestGet({ env: {} })
  const body = await response.json()

  expect(response.status).toBe(500)
  expect(body.error).toBe('Missing STATUS_STORE KV binding.')
})

test('PUT rejects writes outside admin target', async () => {
  const response = await onRequestPut({
    request: jsonRequest(validData()),
    env: { APP_TARGET: 'status', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(403)
  expect(body.error).toBe('Writes are only allowed from the admin app.')
})

test('PUT accepts writes with Vite admin target binding', async () => {
  const response = await onRequestPut({
    request: jsonRequest(validData()),
    env: { VITE_APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })

  expect(response.status).toBe(200)
})

test('PUT rejects malformed JSON', async () => {
  const response = await onRequestPut({
    request: new Request('https://example.com/api/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    }),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.error).toBe('Request body must be valid JSON.')
})

test('PUT rejects invalid status and task data', async () => {
  const response = await onRequestPut({
    request: jsonRequest({
      statusEntries: [
        { id: 'bad', category: 'Marketing & Sichtbarkeit', title: '', status: 'Unknown' },
      ],
      tasks: [{ id: 'bad-task', title: 'Task', dueDate: 'not-a-date' }],
    }),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.error).toBe('Invalid status data.')
  expect(body.details).toEqual([
    'statusEntries[0] is invalid.',
    'tasks[0] is invalid.',
  ])
})

test('PUT stores normalized valid data', async () => {
  const store = createStore()
  const response = await onRequestPut({
    request: jsonRequest(validData()),
    env: { APP_TARGET: 'admin', STATUS_STORE: store },
  })
  const body = await response.json()
  const stored = JSON.parse(store.values.get('status-data'))

  expect(response.status).toBe(200)
  expect(body.statusEntries[0].category).toBe('Auszahlungen & Vergütung')
  expect(body.statusEntries[0].status).toBe('Offen')
  expect(body.statusEntries[0].createdAt).toBe('2026-05-20')
  expect(stored.statusEntries[0].category).toBe('Auszahlungen & Vergütung')
  expect(stored.settings.showHeaderSummary).toBe(true)
  expect(stored.settings.showNextDue).toBe(true)
  expect(stored.settings.showLiveStatusPill).toBe(true)
  expect(stored.settings.showLiveAge).toBe(false)
  expect(Object.keys(stored.statusEntries[0]).sort()).toEqual([
    'category',
    'createdAt',
    'description',
    'dueDate',
    'id',
    'owner',
    'priority',
    'showProgress',
    'status',
    'title',
    'type',
    'updatedAt',
  ])
  expect(Object.keys(stored.tasks[0]).sort()).toEqual([
    'completed',
    'dueDate',
    'id',
    'notes',
    'owner',
    'reminderInterval',
    'title',
  ])
})

test('PUT stores normalized display settings', async () => {
  const data = validData()
  data.settings = {
    showHeaderSummary: true,
    showNextDue: false,
    showStats: false,
    showFilters: true,
    showCategories: false,
    showProgress: true,
    showLiveStatusPill: false,
    showLiveAge: true,
  }

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.settings).toEqual(data.settings)
})

test('PUT rejects invalid display settings', async () => {
  const data = validData()
  data.settings = {
    showNextDue: 'no',
  }

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.details).toContain('settings.showNextDue must be a boolean.')
})

test('PUT rejects invalid live age display setting', async () => {
  const data = validData()
  data.settings = {
    showLiveAge: 'yes',
  }

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.details).toContain('settings.showLiveAge must be a boolean.')
})

test('PUT rejects invalid live status pill display setting', async () => {
  const data = validData()
  data.settings = {
    showLiveStatusPill: 'yes',
  }

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.details).toContain('settings.showLiveStatusPill must be a boolean.')
})

test('PUT accepts legacy status entries without createdAt', async () => {
  const store = createStore()
  const legacyData = validData()
  delete legacyData.statusEntries[0].createdAt

  const response = await onRequestPut({
    request: jsonRequest(legacyData),
    env: { APP_TARGET: 'admin', STATUS_STORE: store },
  })
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.statusEntries[0].createdAt).toBe('2026-05-21')
})

test('PUT adds default dashboard fields for legacy status entries', async () => {
  const data = validData()
  delete data.statusEntries[0].owner
  delete data.statusEntries[0].type
  delete data.statusEntries[0].priority
  delete data.statusEntries[0].showProgress
  delete data.statusEntries[0].dueDate

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.statusEntries[0].owner).toBe('Operator')
  expect(body.statusEntries[0].type).toBe('info')
  expect(body.statusEntries[0].priority).toBe('Mittlere Priorität')
  expect(body.statusEntries[0].showProgress).toBe(false)
  expect(body.statusEntries[0].dueDate).toBe('2026-05-28')
})

test('PUT preserves urgent status', async () => {
  const data = validData()
  data.statusEntries[0].status = 'Dringend'

  const response = await onRequestPut({
    request: jsonRequest(data),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body.statusEntries[0].status).toBe('Dringend')
})
