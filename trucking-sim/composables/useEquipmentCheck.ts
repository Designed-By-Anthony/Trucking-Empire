import type { Job, Truck } from '~/types/game'

export interface CompatibilityResult {
  ok: boolean
  reason?: string
}

// Strict vehicle-to-job compatibility matrix.
// Called before a job can be added to the manifest or shown as available.
export function checkJobCompatibility(job: Job, truck: Truck): CompatibilityResult {
  // Dock-height access: required for any dock delivery or dock_high tag
  if (job.delivery_type === 'dock' || job.equipment_tags.includes('dock_high')) {
    if (!truck.has_dock_access) {
      return { ok: false, reason: 'Dock access required — needs box truck or larger' }
    }
  }

  // Liftgate: required for tag-flagged stops where customer can't assist unloading
  if (job.equipment_tags.includes('liftgate')) {
    if (!truck.has_liftgate) {
      return { ok: false, reason: 'Liftgate required — truck not equipped' }
    }
  }

  return { ok: true }
}
