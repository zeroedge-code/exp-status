import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { StatusApp } from './main-status.jsx'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

test('shows status entries loaded from the API', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      settings: {
        showNextDue: false,
      },
      statusEntries: [
        {
          id: 'api-entry',
          category: 'Marketing',
          title: 'Kampagne freigeben',
          status: 'Dringend',
          createdAt: '2026-05-21',
          updatedAt: '2026-05-22',
          dueDate: '2026-05-21',
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
  expect(screen.getAllByText('Dringend').length).toBeGreaterThan(0)
  expect(screen.getByText('Fällig: Überfällig')).toBeInTheDocument()
  expect(screen.getByText('1 von 1 Einträgen angezeigt')).toBeInTheDocument()
  expect(screen.queryByText(/nächste Frist/)).not.toBeInTheDocument()
  expect(screen.queryByText('Fortschritt')).not.toBeInTheDocument()
})

test('sorts visible entries by relevance within categories', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      statusEntries: [
        {
          id: 'done-entry',
          category: 'Weitere Themen',
          title: 'Archivierter Punkt',
          status: 'Erledigt',
          createdAt: '2026-05-18',
          updatedAt: '2026-05-18',
          dueDate: '2026-05-18',
          description: 'Schon erledigt.',
        },
        {
          id: 'urgent-entry',
          category: 'Weitere Themen',
          title: 'Sofort prüfen',
          status: 'Dringend',
          createdAt: '2026-05-20',
          updatedAt: '2026-05-20',
          dueDate: '2026-05-21',
          description: 'Braucht Aufmerksamkeit.',
        },
        {
          id: 'new-entry',
          category: 'Weitere Themen',
          title: 'Neu vorbereiten',
          status: 'Neu',
          createdAt: '2026-05-19',
          updatedAt: '2026-05-19',
          dueDate: '2026-05-22',
          description: 'Wird vorbereitet.',
        },
      ],
    }),
  })

  render(<StatusApp />)

  await screen.findByRole('heading', { name: 'Sofort prüfen' })
  const cards = screen.getAllByRole('article')

  expect(within(cards[0]).getByRole('heading', { name: 'Sofort prüfen' })).toBeInTheDocument()
  expect(within(cards[1]).getByRole('heading', { name: 'Neu vorbereiten' })).toBeInTheDocument()
  expect(within(cards[2]).getByRole('heading', { name: 'Archivierter Punkt' })).toBeInTheDocument()
})

test('renders completed entries with reduced emphasis', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      statusEntries: [
        {
          id: 'done-muted-entry',
          category: 'Weitere Themen',
          title: 'Abgeschlossenes Thema',
          status: 'Erledigt',
          createdAt: '2026-05-18',
          updatedAt: '2026-05-18',
          dueDate: '2026-05-18',
          description: 'Ist abgeschlossen.',
        },
      ],
    }),
  })

  render(<StatusApp />)

  await screen.findByRole('heading', { name: 'Abgeschlossenes Thema' })
  expect(screen.getByRole('article', { name: 'Abgeschlossenes Thema' })).toHaveClass('status-card-done')
})

test('toggles production mock data when enabled by URL', async () => {
  const user = userEvent.setup()
  window.history.replaceState({}, '', '/status?mockToggle=1')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      statusEntries: [
        {
          id: 'live-entry',
          category: 'Weitere Themen',
          title: 'Live-Eintrag',
          status: 'Offen',
          createdAt: '2026-05-20',
          updatedAt: '2026-05-20',
          dueDate: '2026-05-27',
          description: 'Live-Daten sind aktiv.',
        },
      ],
    }),
  })

  render(<StatusApp />)

  expect(await screen.findByRole('heading', { name: 'Live-Eintrag' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Live' })).toHaveAttribute('aria-pressed', 'true')

  await user.click(screen.getByRole('button', { name: 'Demo' }))

  expect(await screen.findByRole('heading', { name: 'Auszahlungslauf Mai final prüfen' })).toBeInTheDocument()
  expect(screen.getByText('12 von 12 Einträgen angezeigt')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Demo' })).toHaveAttribute('aria-pressed', 'true')
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
