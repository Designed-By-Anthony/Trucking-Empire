import type { Job } from '~/types/game'

// Stop service time in game-hours based on freight weight and delivery type.
// Shared by app.vue, DeliveryPanel, and DispatchEventModal — single source of truth.
export function serviceHoursForJob(job: Job): number {
  if (job.delivery_type === 'dock' || job.weight_lbs > 1000) return 0.5
  if (job.weight_lbs > 400) return 0.35
  return 0.2
}
