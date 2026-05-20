const STORE_KEY = 'status-data'

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

function normalizeData(rawData) {
  return {
    statusEntries: Array.isArray(rawData?.statusEntries) ? rawData.statusEntries : [],
    tasks: Array.isArray(rawData?.tasks)
      ? rawData.tasks.map((task) => ({
          ...task,
          completed: Boolean(task.completed),
        }))
      : [],
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

  const nextData = normalizeData(await request.json())
  await env.STATUS_STORE.put(STORE_KEY, JSON.stringify(nextData))

  return jsonResponse(nextData)
}
