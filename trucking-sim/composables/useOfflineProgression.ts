import { serviceHoursForJob } from '~/composables/useServiceTime'

// Maximum real-time hours to fast-forward. Beyond this, the player likely
// expects to find the day complete rather than mid-route.
const MAX_OFFLINE_REAL_HOURS = 24

export function applyOfflineProgression(bundle: Record<string, any>): Record<string, any> {
  const savedAt: number = bundle.saved_at ?? 0
  if (!savedAt) return bundle

  const elapsedRealMs = Math.min(
    Date.now() - savedAt,
    MAX_OFFLINE_REAL_HOURS * 3_600_000,
  )
  if (elapsedRealMs < 30_000) return bundle  // < 30 seconds — don't bother

  const clockSpeed: number = bundle.game?.clock_speed ?? 1
  if (clockSpeed === 0) return bundle  // was paused when they left

  const elapsedGameHours = (elapsedRealMs / 3_600_000) * clockSpeed
  const oldTick: number = bundle.game?.company?.date_tick ?? 0
  const newTick = oldTick + elapsedGameHours

  // Advance the game clock
  if (!bundle.game?.company) return bundle
  bundle.game.company.date_tick = newTick

  // Mark route stops as delivered if their ETA + service time has passed.
  // Do NOT credit revenue here — the tick watcher in app.vue handles settlement
  // exactly once when it sees current_stop_index >= manifest.length.
  const fleetRoutes: Record<string, any> = bundle.day?.fleet_routes ?? {}
  for (const route of Object.values(fleetRoutes)) {
    if (route.route_phase !== 'in_progress') continue

    const manifest: any[] = route.manifest ?? []
    let nextIdx = route.current_stop_index ?? 0

    for (let i = nextIdx; i < manifest.length; i++) {
      const stop = manifest[i]
      if (!stop || stop.stop_type === 'terminal_return') continue
      if (stop.job?.status === 'delivered') { nextIdx = i + 1; continue }

      const svcH = serviceHoursForJob(stop.job)
      const eta: number = stop.eta_game_hour ?? 999
      if (newTick >= eta + svcH) {
        stop.job.status = 'delivered'
        stop.on_time = newTick <= eta + svcH + 0.5
        nextIdx = i + 1
      }
    }

    route.current_stop_index = nextIdx
  }

  return bundle
}
