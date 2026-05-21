import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, normalizeStatusEntries } from './statusData.js'

test('normalizeStatusEntries migrates old category names', () => {
  const entries = normalizeStatusEntries({
    statusEntries: [
      {
        id: 'one',
        category: 'Finanzierung & Bank',
        title: 'Unterlagen',
        status: 'In Bearbeitung',
        updatedAt: '2026-05-20',
        description: 'Prüfung läuft.',
      },
      {
        id: 'two',
        category: 'Organisation',
        title: 'Termin',
        status: 'Abgeschlossen',
        updatedAt: '2026-05-21',
        description: 'Bestätigt.',
      },
    ],
  })

  assert.equal(entries[0].category, 'Finanzen & Expertenzahlungen')
  assert.equal(entries[1].category, 'Abstimmung & Organisation')
})

test('normalizeStatusEntries returns provided fallback for malformed data', () => {
  const fallback = [{ id: 'fallback' }]

  assert.equal(normalizeStatusEntries({}, fallback), fallback)
  assert.equal(normalizeStatusEntries({ statusEntries: null }, fallback), fallback)
})

test('formatDate formats German dates and handles empty values', () => {
  assert.equal(formatDate('2026-05-21'), '21.05.2026')
  assert.equal(formatDate(''), 'Kein Datum')
})
