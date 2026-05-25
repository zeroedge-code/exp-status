import { expect, test } from 'vitest'
import { formatDate, normalizeDisplaySettings, normalizeStatusEntries } from './statusData.js'

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
      {
        id: 'three',
        category: 'Webseiten & Neuerungen',
        title: 'Neue Funktion',
        status: 'Neu',
        updatedAt: '2026-05-22',
        description: 'Update ist vorbereitet.',
      },
    ],
  })

  expect(entries[0].category).toBe('Auszahlungen & Vergütung')
  expect(entries[1].category).toBe('Termine & Koordination')
  expect(entries[2].category).toBe('Website & Updates')
  expect(entries[0].status).toBe('Offen')
  expect(entries[1].status).toBe('Erledigt')
  expect(entries[0].createdAt).toBe('2026-05-20')
  expect(entries[0].owner).toBe('Operator')
  expect(entries[0].type).toBe('info')
  expect(entries[0].priority).toBe('Mittlere Priorität')
  expect(entries[0].showProgress).toBe(false)
  expect(entries[0].dueDate).toBe('2026-05-27')
})

test('normalizeStatusEntries preserves urgent status', () => {
  const entries = normalizeStatusEntries({
    statusEntries: [
      {
        id: 'urgent',
        category: 'Marketing',
        title: 'Frist',
        status: 'Dringend',
        updatedAt: '2026-05-21',
        description: 'Bitte zeitnah prüfen.',
      },
    ],
  })

  expect(entries[0].category).toBe('Marketing & Sichtbarkeit')
  expect(entries[0].status).toBe('Dringend')
})

test('normalizeStatusEntries returns provided fallback for malformed data', () => {
  const fallback = [{ id: 'fallback' }]

  expect(normalizeStatusEntries({}, fallback)).toBe(fallback)
  expect(normalizeStatusEntries({ statusEntries: null }, fallback)).toBe(fallback)
})

test('normalizeDisplaySettings merges stored display settings with defaults', () => {
  const settings = normalizeDisplaySettings({
    settings: {
      showNextDue: false,
      showStats: false,
      showFilters: 'invalid',
    },
  })

  expect(settings.showNextDue).toBe(false)
  expect(settings.showStats).toBe(false)
  expect(settings.showFilters).toBe(true)
  expect(settings.showCategories).toBe(true)
})

test('formatDate formats German dates and handles empty values', () => {
  expect(formatDate('2026-05-21')).toBe('21.05.2026')
  expect(formatDate('')).toBe('Kein Datum')
})
