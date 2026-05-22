import {
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App.jsx'

const initialApiData = {
  statusEntries: [
    {
      id: 'entry-one',
      category: 'Auszahlungen & Vergütung',
      title: 'API Zahlungsunterlagen',
      status: 'Offen',
      createdAt: '2026-05-18',
      updatedAt: '2026-05-18',
      description: 'Die eingereichten Unterlagen liegen zur Prüfung vor.',
    },
  ],
  tasks: [],
}

function mockStatusApi(data = initialApiData) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options = {}) => {
    if (options.method === 'PUT') {
      return {
        ok: true,
        json: async () => JSON.parse(options.body),
      }
    }

    return {
      ok: true,
      json: async () => data,
    }
  })
}

function mockFailingSaveApi(data = initialApiData) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options = {}) => {
    if (options.method === 'PUT') {
      return {
        ok: false,
        json: async () => ({ error: 'Statusdaten konnten nicht gespeichert werden.' }),
      }
    }

    return {
      ok: true,
      json: async () => data,
    }
  })
}

async function renderLoadedAdmin() {
  render(<App adminOnly />)
  await screen.findByRole('heading', { name: 'Internes Dashboard' })
  await screen.findByRole('heading', { name: 'API Zahlungsunterlagen' })
}

beforeEach(() => {
  mockStatusApi()
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('new-entry-id')
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('creates a status entry from the intern dashboard form', async () => {
  const user = userEvent.setup()

  await renderLoadedAdmin()

  await user.selectOptions(screen.getByLabelText('Kategorie'), 'Marketing & Sichtbarkeit')
  await user.selectOptions(screen.getByLabelText('Status'), 'Dringend')
  await user.type(screen.getByLabelText('Titel'), 'Neue Experteninfo')
  await user.clear(screen.getByLabelText('Datum letzter Stand'))
  await user.type(screen.getByLabelText('Datum letzter Stand'), '2026-05-22')
  await user.clear(screen.getByLabelText('Fälligkeitsdatum'))
  await user.type(screen.getByLabelText('Fälligkeitsdatum'), '2026-05-24')
  await user.type(screen.getByLabelText('Beschreibung'), 'Bitte heute freigeben.')
  await user.click(screen.getByRole('button', { name: 'Anlegen' }))

  expect(
    screen.getByRole('heading', { name: 'Neue Experteninfo' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText('Marketing & Sichtbarkeit · Dringend · Operator · fällig 24.05.2026'),
  ).toBeInTheDocument()
})

test('edits an existing status entry from its dashboard row', async () => {
  const user = userEvent.setup()

  await renderLoadedAdmin()

  const entryHeading = await screen.findByRole('heading', {
    name: 'API Zahlungsunterlagen',
  })
  const entryRow = entryHeading.closest('article')

  await user.click(within(entryRow).getByRole('button', { name: 'Bearbeiten' }))
  await user.clear(screen.getByLabelText('Titel'))
  await user.type(screen.getByLabelText('Titel'), 'Zahlungsunterlagen geprüft')
  await user.selectOptions(screen.getByLabelText('Status'), 'Erledigt')
  await user.click(
    await screen.findByRole('button', { name: 'Änderungen speichern' }),
  )

  expect(
    screen.getByRole('heading', { name: 'Zahlungsunterlagen geprüft' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'API Zahlungsunterlagen' })).not.toBeInTheDocument()
  expect(
    screen.getByText('Auszahlungen & Vergütung · Erledigt · Operator · fällig 25.05.2026'),
  ).toBeInTheDocument()
})

test('deletes a status entry after confirmation', async () => {
  const user = userEvent.setup()

  await renderLoadedAdmin()

  const entryHeading = await screen.findByRole('heading', {
    name: 'API Zahlungsunterlagen',
  })
  const entryRow = entryHeading.closest('article')

  await user.click(within(entryRow).getByRole('button', { name: 'Löschen' }))
  await user.click(await screen.findByRole('button', { name: 'Löschen bestätigen' }))

  expect(
    screen.queryByRole('heading', { name: 'API Zahlungsunterlagen' }),
  ).not.toBeInTheDocument()
})

test('restores the previous status entry when saving an edit fails', async () => {
  vi.restoreAllMocks()
  mockFailingSaveApi()
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('new-entry-id')
  const user = userEvent.setup()

  await renderLoadedAdmin()

  const entryHeading = await screen.findByRole('heading', {
    name: 'API Zahlungsunterlagen',
  })
  const entryRow = entryHeading.closest('article')

  await user.click(within(entryRow).getByRole('button', { name: 'Bearbeiten' }))
  await user.clear(screen.getByLabelText('Titel'))
  await user.type(screen.getByLabelText('Titel'), 'Nicht gespeicherter Titel')
  await user.click(
    await screen.findByRole('button', { name: 'Änderungen speichern' }),
  )

  expect(
    await screen.findByText('Statusdaten konnten nicht gespeichert werden.'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'API Zahlungsunterlagen' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Nicht gespeicherter Titel' }),
  ).not.toBeInTheDocument()
})
