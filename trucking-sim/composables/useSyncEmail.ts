import { applyOfflineProgression } from '~/composables/useOfflineProgression'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'

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

// Server-only check — no localStorage fallback.
// Used when probing whether an email key exists in the cloud.
async function loadServerState(pid: string) {
  try {
    const res = await timedFetch(`/api/state?id=${encodeURIComponent(pid)}`)
    if (res.ok) { const data = await res.json(); if (data?.state?.game) return data.state }
  } catch {}
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
  // Also keep UUID key current so persist.client.ts startup finds email-linked state on reload
  const uuid = getUUID()

  try {
    // Server-only probe — localStorage has local game state for every player and would
    // always appear as a "cloud restore" even on first link.
    const existing = await loadServerState(pid)
    if (existing?.game) {
      const advanced = applyOfflineProgression(existing)
      game.$patch(advanced.game)
      if (advanced.fleet) fleet.$patch(advanced.fleet)
      if (advanced.contracts) contracts.$patch(advanced.contracts)
      if (advanced.day) day.$patch(advanced.day)
      if (advanced.network) network.$patch(advanced.network)
      game.company.player_email = email.trim().toLowerCase()
      const bundle = buildBundle(game, fleet, contracts, day, network)
      // Save under both keys: email key for cross-device, UUID key so the next
      // page reload (which loads by UUID first) finds the email-linked state.
      await saveState(pid, bundle)
      await saveState(uuid, bundle)
      return 'restored'
    } else {
      game.company.player_email = email.trim().toLowerCase()
      const bundle = buildBundle(game, fleet, contracts, day, network)
      await saveState(pid, bundle)
      await saveState(uuid, bundle)
      return 'linked'
    }
  } catch {
    return 'error'
  }
}
