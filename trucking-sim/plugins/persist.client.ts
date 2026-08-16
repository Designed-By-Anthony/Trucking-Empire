import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { registerImmediateSave } from '~/composables/usePersistStatus'

const PID_KEY = 'fe:pid'
const LS_KEY = 'fe:state'
const RESET_FLAG = 'fe:reset'

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

async function loadState(pid: string): Promise<{ game: any; fleet: any; contracts: any; day?: any } | null> {
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

async function saveState(pid: string, state: { game: any; fleet: any; contracts: any; day: any }) {
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

function scheduleSave(pid: string, game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>, day: ReturnType<typeof useDayStore>) {
  if (saveScheduled) return
  saveScheduled = true
  const delay = Math.max(0, THROTTLE_MS - (Date.now() - lastSave))
  setTimeout(() => {
    saveScheduled = false
    lastSave = Date.now()
    saveState(pid, { game: game.$state, fleet: fleet.$state, contracts: contracts.$state, day: { day_history: day.day_history } })
  }, delay)
}

function wireSubscriptions(pid: string, game: ReturnType<typeof useGameStore>, fleet: ReturnType<typeof useFleetStore>, contracts: ReturnType<typeof useContractStore>, day: ReturnType<typeof useDayStore>) {
  game.$subscribe(() => scheduleSave(pid, game, fleet, contracts, day), { detached: true })
  fleet.$subscribe(() => scheduleSave(pid, game, fleet, contracts, day), { detached: true })
  contracts.$subscribe(() => scheduleSave(pid, game, fleet, contracts, day), { detached: true })
  day.$subscribe(() => scheduleSave(pid, game, fleet, contracts, day), { detached: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(pid, { game: game.$state, fleet: fleet.$state, contracts: contracts.$state, day: { day_history: day.day_history } })
    }
  })
}

export default defineNuxtPlugin(async () => {
  const game = useGameStore()
  const fleet = useFleetStore()
  const contracts = useContractStore()
  const day = useDayStore()

  // If a reset was requested, skip hydration entirely so stores start clean.
  // sessionStorage survives location.reload() within the same tab, making it
  // a reliable one-shot signal across the reload boundary.
  if (sessionStorage.getItem(RESET_FLAG)) {
    sessionStorage.removeItem(RESET_FLAG)
    const pid = getPlayerId()
    wireSubscriptions(pid, game, fleet, contracts, day)
    return
  }

  // Normal path: hydrate from KV then localStorage fallback
  const pid = getPlayerId()
  const saved = await loadState(pid)
  if (saved) {
    if (saved.game) game.$patch(saved.game)
    if (saved.fleet) fleet.$patch(saved.fleet)
    if (saved.contracts) contracts.$patch(saved.contracts)
    if (saved.day?.day_history) day.$patch({ day_history: saved.day.day_history })
  }

  // After restoring fleet state, clear any phantom truck statuses. A truck left
  // in EN_ROUTE/LOADING with no active day route is orphaned — reset it to Idle
  // so the morning board can see it as available.
  fleet.validatePhantomRoutes(day.phase)

  wireSubscriptions(pid, game, fleet, contracts, day)

  // Register an unthrottled save for end-of-day checkpoints
  registerImmediateSave(() =>
    saveState(pid, { game: game.$state, fleet: fleet.$state, contracts: contracts.$state, day: { day_history: day.day_history } })
  )
})
