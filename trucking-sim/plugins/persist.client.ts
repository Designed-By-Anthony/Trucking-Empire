import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'

const PID_KEY = 'fe:pid'
const LS_KEY = 'fe:state'

function getPlayerId(): string {
  let id = localStorage.getItem(PID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PID_KEY, id)
  }
  return id
}

function timedFetch(url: string, opts?: RequestInit, ms = 4000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

async function loadState(pid: string): Promise<{ game: any; fleet: any; contracts: any } | null> {
  // Try KV first
  try {
    const res = await timedFetch(`/api/state?id=${encodeURIComponent(pid)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.state?.game) return data.state
    }
  } catch {}
  // Fallback: localStorage mirror
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

async function saveState(pid: string, state: { game: any; fleet: any; contracts: any }) {
  // Mirror to localStorage immediately (sync, best-effort)
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {}
  // Push to KV (async, best-effort)
  try {
    await timedFetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pid, state }),
    })
  } catch {}
}

// Throttle: at most one KV write every 8s during active gameplay
let saveScheduled = false
let lastSave = 0
const THROTTLE_MS = 8_000

function scheduleSave(pid: string, game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>) {
  if (saveScheduled) return
  saveScheduled = true
  const delay = Math.max(0, THROTTLE_MS - (Date.now() - lastSave))
  setTimeout(() => {
    saveScheduled = false
    lastSave = Date.now()
    saveState(pid, {
      game: game.$state,
      fleet: fleet.$state,
      contracts: contracts.$state,
    })
  }, delay)
}

export default defineNuxtPlugin(async () => {
  const game = useGameStore()
  const fleet = useFleetStore()
  const contracts = useContractStore()

  const pid = getPlayerId()

  // Hydrate stores from KV (or localStorage fallback)
  const saved = await loadState(pid)
  if (saved) {
    if (saved.game) game.$patch(saved.game)
    if (saved.fleet) fleet.$patch(saved.fleet)
    if (saved.contracts) contracts.$patch(saved.contracts)
  }

  // Subscribe to mutations → throttled KV save
  game.$subscribe(() => scheduleSave(pid, game, fleet, contracts), { detached: true })
  fleet.$subscribe(() => scheduleSave(pid, game, fleet, contracts), { detached: true })
  contracts.$subscribe(() => scheduleSave(pid, game, fleet, contracts), { detached: true })

  // iOS Safari fires visibilitychange just before killing the tab → save immediately
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(pid, {
        game: game.$state,
        fleet: fleet.$state,
        contracts: contracts.$state,
      })
    }
  })
})
