import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { registerImmediateSave } from '~/composables/usePersistStatus'

const UUID_KEY = 'fe:pid'
const LS_KEY = 'fe:state'
const RESET_FLAG = 'fe:reset'

function getUUID(): string {
  let id = localStorage.getItem(UUID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(UUID_KEY, id)
  }
  return id
}

// Derive a stable KV key: email if linked, else UUID
function getPlayerId(game: ReturnType<typeof useGameStore>): string {
  const email = game.company.player_email?.trim()
  return email ? `email:${email.toLowerCase()}` : getUUID()
}

function timedFetch(url: string, opts?: RequestInit, ms = 6000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

type SaveBundle = { game: any; fleet: any; contracts: any; day?: any }

async function loadState(pid: string): Promise<SaveBundle | null> {
  try {
    const res = await timedFetch(`/api/state?id=${encodeURIComponent(pid)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.state?.game) return data.state
    }
  } catch {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

async function saveState(pid: string, state: SaveBundle) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {}
  try {
    await timedFetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pid, state }),
    })
  } catch {}
}

let saveScheduled = false
let lastSave = 0
const THROTTLE_MS = 8_000

function buildBundle(game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>, day: ReturnType<typeof useDayStore>): SaveBundle {
  return { game: game.$state, fleet: fleet.$state, contracts: contracts.$state, day: { day_history: day.day_history } }
}

function scheduleSave(game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>, day: ReturnType<typeof useDayStore>) {
  if (saveScheduled) return
  saveScheduled = true
  const delay = Math.max(0, THROTTLE_MS - (Date.now() - lastSave))
  setTimeout(() => {
    saveScheduled = false
    lastSave = Date.now()
    saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day))
  }, delay)
}

function wireSubscriptions(game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>, day: ReturnType<typeof useDayStore>) {
  game.$subscribe(() => scheduleSave(game, fleet, contracts, day), { detached: true })
  fleet.$subscribe(() => scheduleSave(game, fleet, contracts, day), { detached: true })
  contracts.$subscribe(() => scheduleSave(game, fleet, contracts, day), { detached: true })
  day.$subscribe(() => scheduleSave(game, fleet, contracts, day), { detached: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day))
    }
  })
}


export default defineNuxtPlugin(async () => {
  const game = useGameStore()
  const fleet = useFleetStore()
  const contracts = useContractStore()
  const day = useDayStore()

  // If a reset was requested, skip hydration entirely
  if (sessionStorage.getItem(RESET_FLAG)) {
    sessionStorage.removeItem(RESET_FLAG)
    wireSubscriptions(game, fleet, contracts, day)
    registerImmediateSave(() => saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day)))
    return
  }

  // Normal path: hydrate from KV (email key if set, else UUID)
  const uuid = getUUID()
  const saved = await loadState(uuid)
  if (saved) {
    if (saved.game) game.$patch(saved.game)
    if (saved.fleet) fleet.$patch(saved.fleet)
    if (saved.contracts) contracts.$patch(saved.contracts)
    if (saved.day?.day_history) day.$patch({ day_history: saved.day.day_history })
  }

  // If the restored state has an email, re-save under the email key too
  const email = game.company.player_email?.trim().toLowerCase()
  if (email) {
    saveState(`email:${email}`, buildBundle(game, fleet, contracts, day))
  }

  fleet.validatePhantomRoutes(day.phase)
  wireSubscriptions(game, fleet, contracts, day)
  registerImmediateSave(() => saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day)))
})
