import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { registerImmediateSave } from '~/composables/usePersistStatus'
import { applyOfflineProgression } from '~/composables/useOfflineProgression'

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

function getPlayerId(game: ReturnType<typeof useGameStore>): string {
  const email = game.company.player_email?.trim()
  return email ? `email:${email.toLowerCase()}` : getUUID()
}

function timedFetch(url: string, opts?: RequestInit, ms = 6000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

type SaveBundle = {
  game: any
  fleet: any
  contracts: any
  network: any
  day: any
  saved_at: number
}

async function loadState(pid: string): Promise<SaveBundle | null> {
  try {
    const res = await timedFetch(`/api/state?id=${encodeURIComponent(pid)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.state?.game) return data.state as SaveBundle
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

function buildBundle(
  game: ReturnType<typeof useGameStore>,
  fleet: ReturnType<typeof useFleetStore>,
  contracts: ReturnType<typeof useContractStore>,
  day: ReturnType<typeof useDayStore>,
  network: ReturnType<typeof useNetworkStore>,
): SaveBundle {
  return {
    game: game.$state,
    fleet: fleet.$state,
    contracts: contracts.$state,
    // Full day state — includes fleet_routes (active manifests), available_jobs, phase
    day: day.$state,
    // Dock freight, outbound staged, line haul market
    network: network.$state,
    saved_at: Date.now(),
  }
}

function applyBundle(
  bundle: SaveBundle,
  game: ReturnType<typeof useGameStore>,
  fleet: ReturnType<typeof useFleetStore>,
  contracts: ReturnType<typeof useContractStore>,
  day: ReturnType<typeof useDayStore>,
  network: ReturnType<typeof useNetworkStore>,
) {
  if (bundle.game) game.$patch(bundle.game)
  if (bundle.fleet) fleet.$patch(bundle.fleet)
  if (bundle.contracts) contracts.$patch(bundle.contracts)
  if (bundle.day) day.$patch(bundle.day)
  if (bundle.network) network.$patch(bundle.network)
}

function scheduleSave(
  game: ReturnType<typeof useGameStore>,
  fleet: ReturnType<typeof useFleetStore>,
  contracts: ReturnType<typeof useContractStore>,
  day: ReturnType<typeof useDayStore>,
  network: ReturnType<typeof useNetworkStore>,
) {
  if (saveScheduled) return
  saveScheduled = true
  const delay = Math.max(0, THROTTLE_MS - (Date.now() - lastSave))
  setTimeout(() => {
    saveScheduled = false
    lastSave = Date.now()
    saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day, network))
  }, delay)
}

function wireSubscriptions(
  game: ReturnType<typeof useGameStore>,
  fleet: ReturnType<typeof useFleetStore>,
  contracts: ReturnType<typeof useContractStore>,
  day: ReturnType<typeof useDayStore>,
  network: ReturnType<typeof useNetworkStore>,
) {
  const save = () => scheduleSave(game, fleet, contracts, day, network)
  game.$subscribe(save, { detached: true })
  fleet.$subscribe(save, { detached: true })
  contracts.$subscribe(save, { detached: true })
  day.$subscribe(save, { detached: true })
  network.$subscribe(save, { detached: true })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day, network))
    }
  })
}

export default defineNuxtPlugin(async () => {
  const game = useGameStore()
  const fleet = useFleetStore()
  const contracts = useContractStore()
  const day = useDayStore()
  const network = useNetworkStore()

  if (sessionStorage.getItem(RESET_FLAG)) {
    sessionStorage.removeItem(RESET_FLAG)
    wireSubscriptions(game, fleet, contracts, day, network)
    registerImmediateSave(() => saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day, network)))
    return
  }

  const uuid = getUUID()
  let saved = await loadState(uuid)

  if (saved) {
    // Fast-forward game state by however much real time passed since last save
    saved = applyOfflineProgression(saved) as SaveBundle
    applyBundle(saved, game, fleet, contracts, day, network)
  }

  // If email is linked, also save under the email key and check for a cloud save
  const email = game.company.player_email?.trim().toLowerCase()
  if (email) {
    const emailPid = `email:${email}`
    const emailSave = await loadState(emailPid)
    if (emailSave) {
      const advanced = applyOfflineProgression(emailSave) as SaveBundle
      applyBundle(advanced, game, fleet, contracts, day, network)
    }
    saveState(emailPid, buildBundle(game, fleet, contracts, day, network))
  }

  fleet.validatePhantomRoutes(day.phase)
  wireSubscriptions(game, fleet, contracts, day, network)
  registerImmediateSave(() => saveState(getPlayerId(game), buildBundle(game, fleet, contracts, day, network)))
})
