import test from 'node:test'
import assert from 'node:assert/strict'
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
        updatedAt: '2026-05-21',
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

  assert.equal(response.status, 200)
  assert.equal(body.statusEntries.length, 3)
  assert.equal(body.tasks.length, 0)
  assert.ok(store.values.has('status-data'))
})

test('PUT rejects writes outside admin target', async () => {
  const response = await onRequestPut({
    request: jsonRequest(validData()),
    env: { APP_TARGET: 'status', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Writes are only allowed from the admin app.')
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

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Request body must be valid JSON.')
})

test('PUT rejects invalid status and task data', async () => {
  const response = await onRequestPut({
    request: jsonRequest({
      statusEntries: [{ id: 'bad', category: 'Marketing', title: '', status: 'Unknown' }],
      tasks: [{ id: 'bad-task', title: 'Task', dueDate: 'not-a-date' }],
    }),
    env: { APP_TARGET: 'admin', STATUS_STORE: createStore() },
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Invalid status data.')
  assert.deepEqual(body.details, [
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

  assert.equal(response.status, 200)
  assert.equal(body.statusEntries[0].category, 'Finanzen & Expertenzahlungen')
  assert.equal(stored.statusEntries[0].category, 'Finanzen & Expertenzahlungen')
  assert.deepEqual(Object.keys(stored.tasks[0]).sort(), [
    'completed',
    'dueDate',
    'id',
    'notes',
    'owner',
    'reminderInterval',
    'title',
  ])
})
