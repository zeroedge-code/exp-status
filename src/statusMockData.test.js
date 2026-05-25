import { expect, test } from 'vitest'
import { mockStatusData } from './statusMockData.js'
import { normalizeStatusEntries } from './statusData.js'

test('visual mock status data stays valid', () => {
  const entries = normalizeStatusEntries(mockStatusData, [])

  expect(entries).toHaveLength(mockStatusData.statusEntries.length)
  expect(entries.length).toBeGreaterThan(10)
  expect(entries.some((entry) => entry.status === 'Dringend')).toBe(true)
  expect(entries.some((entry) => entry.status === 'Erledigt')).toBe(true)
})
