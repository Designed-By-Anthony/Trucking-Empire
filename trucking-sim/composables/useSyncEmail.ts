import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { applyOfflineProgression } from '~/composables/useOfflineProgression'

export type SyncResult = 'linked' | 'restored' | 'error'

const UUID_KEY = 'fe:pid'
const LS_KEY = 'fe:state'

function getUUID(): string {
  let id = localStorage.getItem(UUID_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(UUID_KEY, id) }
  return id
}

function timedFetch(url: string, opts?: RequestInit, ms = 6000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

async function loadState(pid: string) {
  try {
    const res = await timedFetch(`/api/state?id=${encodeURIComponent(pid)}`)
    if (res.ok) { const data = await res.json(); if (data?.state?.game) return data.state }
  } catch {}
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw) } catch {}
  return null
}

async function saveState(pid: string, state: object) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {}
  try {
    await timedFetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pid, state }),
    })
  } catch {}
}

function buildBundle(
  game: ReturnType<typeof useGameStore>,
  fleet: ReturnType<typeof useFleetStore>,
  contracts: ReturnType<typeof useContractStore>,
  day: ReturnType<typeof useDayStore>,
  network: ReturnType<typeof useNetworkStore>,
) {
  return {
    game: game.$state,
    fleet: fleet.$state,
    contracts: contracts.$state,
    day: day.$state,
    network: network.$state,
    saved_at: Date.now(),
  }
}

export async function syncByEmail(email: string): Promise<SyncResult> {
  const game = useGameStore()
  const fleet = useFleetStore()
  const contracts = useContractStore()
  const day = useDayStore()
  const network = useNetworkStore()

  const pid = `email:${email.trim().toLowerCase()}`
  try {
    let existing = await loadState(pid)
    if (existing?.game) {
      existing = applyOfflineProgression(existing)
      game.$patch(existing.game)
      if (existing.fleet) fleet.$patch(existing.fleet)
      if (existing.contracts) contracts.$patch(existing.contracts)
      if (existing.day) day.$patch(existing.day)
      if (existing.network) network.$patch(existing.network)
      game.company.player_email = email.trim().toLowerCase()
      await saveState(pid, buildBundle(game, fleet, contracts, day, network))
      return 'restored'
    } else {
      game.company.player_email = email.trim().toLowerCase()
      await saveState(pid, buildBundle(game, fleet, contracts, day, network))
      return 'linked'
    }
  } catch {
    return 'error'
  }
}
