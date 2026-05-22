import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { StatusApp } from './main-status.jsx'

afterEach(() => {
  vi.restoreAllMocks()
})

test('shows status entries loaded from the API', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      statusEntries: [
        {
          id: 'api-entry',
          category: 'Marketing',
          title: 'Kampagne freigeben',
          status: 'Dringend',
          createdAt: '2026-05-21',
          updatedAt: '2026-05-22',
          description: 'Bitte final prüfen.',
        },
      ],
    }),
  })

  render(<StatusApp />)

  expect(
    await screen.findByRole('heading', {
      name: 'Kampagne freigeben',
    }),
  ).toBeInTheDocument()
  expect(screen.getByText('Bitte final prüfen.')).toBeInTheDocument()
  expect(screen.queryByText('Hohe Priorität')).not.toBeInTheDocument()
  expect(screen.getAllByText('Offen').length).toBeGreaterThan(0)
  expect(screen.getByText('Heute aktualisiert')).toBeInTheDocument()
  expect(screen.queryByText('Fortschritt')).not.toBeInTheDocument()
})

test('keeps the fallback status view visible and shows an error when loading fails', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    json: async () => ({}),
  })

  render(<StatusApp />)

  expect(screen.getByText('Statusmeldungen')).toBeInTheDocument()
  expect(
    await screen.findByText('Statusdaten konnten nicht geladen werden.'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {
      name: 'Rückmeldung Zahlungsunterlagen',
    }),
  ).toBeInTheDocument()
})
