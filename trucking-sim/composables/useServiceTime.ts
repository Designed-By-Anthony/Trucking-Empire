import type { Job, ManifestStop } from '~/types/game'

// Dwell time at each stop in game-hours, keyed by delivery type.
// Residential 8 min (6-10 range midpoint), Commercial 15 min (12-18), Dock/Liftgate 27 min (20-35).
export function serviceHoursForJob(job: Job): number {
  const isDock = job.delivery_type === 'dock'
    || job.equipment_tags?.includes('liftgate')
    || job.equipment_tags?.includes('dock_high')
  if (isDock) return 0.45           // ~27 min
  if (job.delivery_type === 'commercial') return 0.25  // 15 min
  return 0.133                      // ~8 min — residential default
}

// Stop-aware version — terminal_return stops get 30 min for cross-dock unload/reload.
export function serviceHoursForStop(stop: ManifestStop | { stop_type?: string; job: Job }): number {
  if (stop.stop_type === 'terminal_return') return 0.5
  return serviceHoursForJob(stop.job)
}
