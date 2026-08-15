import { defineStore } from 'pinia'
import type { Job, ManifestStop, DayResult, DispatchEvent, DayPhase } from '~/types/game'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useRoutePlanner } from '~/composables/useRoutePlanner'

const VAN_CAPACITY_LBS = 3500
const VAN_CAPACITY_FT3 = 280

export const useDayStore = defineStore('day', {
  state: () => ({
    phase: 'planning' as DayPhase,
    available_jobs: [] as Job[],
    manifest: [] as ManifestStop[],
    truck_id: null as string | null,
    driver_id: null as string | null,
    current_stop_index: 0,
    pending_events: [] as DispatchEvent[],
    active_event: null as DispatchEvent | null,
    day_result: null as DayResult | null,
    base_lat: 43.1009,
    base_lng: -75.2327,
    departure_hour: 7,
    deferred_pickups: [] as Job[],
  }),

  getters: {
    manifest_weight_lbs(): number {
      return this.manifest.reduce((sum, s) => sum + s.job.weight_lbs, 0)
    },
    manifest_volume_ft3(): number {
      return this.manifest.reduce((sum, s) => sum + s.job.volume_ft3, 0)
    },
    weight_pct(): number {
      return Math.min(100, (this.manifest_weight_lbs / VAN_CAPACITY_LBS) * 100)
    },
    volume_pct(): number {
      return Math.min(100, (this.manifest_volume_ft3 / VAN_CAPACITY_FT3) * 100)
    },
    is_over_capacity(): boolean {
      return this.manifest_weight_lbs > VAN_CAPACITY_LBS || this.manifest_volume_ft3 > VAN_CAPACITY_FT3
    },
    can_add_job(): (job: Job) => boolean {
      return (job: Job) =>
        this.manifest_weight_lbs + job.weight_lbs <= VAN_CAPACITY_LBS &&
        this.manifest_volume_ft3 + job.volume_ft3 <= VAN_CAPACITY_FT3
    },
    capacity_lbs(): number { return VAN_CAPACITY_LBS },
    capacity_ft3(): number { return VAN_CAPACITY_FT3 },
  },

  actions: {
    startPlanningPhase(jobs: Job[]) {
      this.phase = 'planning'
      // Prepend any deferred pickups from yesterday's dispatch events
      this.available_jobs = [...this.deferred_pickups, ...jobs]
      this.deferred_pickups = []
      this.manifest = []
      this.current_stop_index = 0
      this.pending_events = []
      this.active_event = null
      this.day_result = null
    },

    addToManifest(job: Job) {
      if (!this.can_add_job(job)) return
      if (this.manifest.find(s => s.job.id === job.id)) return
      job.status = 'on_manifest'
      this.manifest.push({ job, sequence: this.manifest.length + 1, eta_game_hour: 8 + this.manifest.length * 0.75, on_time: null })
      this.available_jobs = this.available_jobs.filter(j => j.id !== job.id)
      // Mark dock freight as consumed so it can't be double-assigned
      if (!job.job_type || job.job_type === 'delivery') {
        useNetworkStore().consumeDelivery(job.id)
      }
    },

    removeFromManifest(jobId: string) {
      const stop = this.manifest.find(s => s.job.id === jobId)
      if (!stop) return
      stop.job.status = 'pending'
      this.manifest = this.manifest.filter(s => s.job.id !== jobId)
      this.available_jobs.push(stop.job)
      this.resequence()
      // Return delivery freight to dock so player can re-add it next day
      if (!stop.job.job_type || stop.job.job_type === 'delivery') {
        useNetworkStore().restoreDelivery(jobId)
      }
    },

    reorderManifest(fromIdx: number, toIdx: number) {
      const stops = [...this.manifest]
      const [moved] = stops.splice(fromIdx, 1)
      stops.splice(toIdx, 0, moved)
      this.manifest = stops
      this.resequence()
    },

    resequence() {
      this.manifest.forEach((s, i) => { s.sequence = i + 1 })
    },

    optimizeManifest() {
      if (this.manifest.length < 2) return

      const LAT_MILES = 69.0
      const LNG_MILES = 52.7
      const AVG_SPEED_MPH = 22
      const SERVICE_H = 0.25
      const DEPARTURE_H = 7

      function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const dLat = (lat2 - lat1) * LAT_MILES
        const dLng = (lng2 - lng1) * LNG_MILES
        return Math.sqrt(dLat ** 2 + dLng ** 2)
      }

      const remaining = [...this.manifest]
      const ordered: ManifestStop[] = []
      let lat = this.base_lat
      let lng = this.base_lng
      let hour = DEPARTURE_H

      while (remaining.length > 0) {
        let bestIdx = 0
        let bestScore = Infinity

        for (let i = 0; i < remaining.length; i++) {
          const stop = remaining[i]
          const d = dist(lat, lng, stop.job.delivery_lat, stop.job.delivery_lng)
          const eta = hour + d / AVG_SPEED_MPH

          // Late penalty: heavy cost per hour past window close
          const latePenalty = eta > stop.job.window_close
            ? (eta - stop.job.window_close) * 200
            : 0

          // Urgency bonus: prioritize stops whose window closes soonest
          const urgencyBonus = stop.job.window_close * 5

          const score = d + latePenalty + urgencyBonus
          if (score < bestScore) {
            bestScore = score
            bestIdx = i
          }
        }

        const chosen = remaining.splice(bestIdx, 1)[0]
        ordered.push(chosen)
        const d = dist(lat, lng, chosen.job.delivery_lat, chosen.job.delivery_lng)
        hour += d / AVG_SPEED_MPH + SERVICE_H
        lat = chosen.job.delivery_lat
        lng = chosen.job.delivery_lng
      }

      this.manifest = ordered
      this.resequence()
    },

    startDay(truckId: string, driverId: string) {
      const gameStore = useGameStore()
      const fleetStore = useFleetStore()
      const { planRoute } = useRoutePlanner()

      this.phase = 'in_progress'
      this.truck_id = truckId
      this.driver_id = driverId
      this.current_stop_index = 0
      this.departure_hour = gameStore.company.date_tick

      // Recalculate ETAs from actual lock-in time so progress bar starts at 0%
      if (this.manifest.length > 0) {
        const plan = planRoute(this.manifest, this.departure_hour)
        plan.stops.forEach((eta, i) => {
          if (this.manifest[i]) {
            this.manifest[i]!.eta_game_hour = eta.arrival_game_hour
          }
        })
      }

      // Sync fleet store so FleetPanel shows correct status and driver info.
      // assignDriverToTruck links driver.assigned_truck_id → enables driverForTruck lookup.
      fleetStore.assignDriverToTruck(driverId, truckId)
      fleetStore.setTruckPhase0Status(truckId, 'EN_ROUTE')
      fleetStore.updateDriverHOS(driverId, { status: 'Driving' })
    },

    completeStop(gameHour: number) {
      const stop = this.manifest[this.current_stop_index]
      if (!stop) return
      stop.job.status = 'delivered'
      stop.on_time = gameHour <= stop.eta_game_hour + 0.25
      this.current_stop_index++
    },

    finishDay(currentTick: number, dayNumber: number) {
      const delivered = this.manifest.filter(s => s.job.status === 'delivered')
      const failed = this.manifest.filter(s => s.job.status !== 'delivered')
      const revenue = delivered.reduce((sum, s) => sum + s.job.payout, 0)
      const latePenalties = delivered.filter(s => s.on_time === false).length * 25
      const lats = this.manifest.map(s => s.job.delivery_lat)
      const lngs = this.manifest.map(s => s.job.delivery_lng)
      const latSpread = this.manifest.length > 1 ? Math.max(...lats) - Math.min(...lats) : 0
      const lngSpread = this.manifest.length > 1 ? Math.max(...lngs) - Math.min(...lngs) : 0
      const spread = Math.sqrt(latSpread * latSpread + lngSpread * lngSpread)
      this.day_result = {
        day: dayNumber,
        date_tick_start: currentTick,
        jobs_attempted: this.manifest.length,
        jobs_delivered: delivered.length,
        jobs_failed: failed.length,
        jobs_declined: this.available_jobs.length,
        revenue,
        late_penalties: latePenalties,
        density_score: Math.max(0, Math.round(100 - spread * 2000)),
        stem_time_hours: 0.5,
        in_zone_hours: delivered.length * 0.4,
      }
      this.phase = 'debrief'
    },

    acceptDispatchEvent(event: DispatchEvent) {
      const { planRoute } = useRoutePlanner()
      const gameStore = useGameStore()

      event.accepted = true
      event.job.status = 'on_manifest'

      // Estimate ETA: last stop completion + 0.5h pickup service buffer
      const lastStop = this.manifest[this.manifest.length - 1]
      const baseEta = lastStop ? lastStop.eta_game_hour + 0.5 : gameStore.company.date_tick + 0.5
      this.manifest.push({ job: event.job, sequence: this.manifest.length + 1, eta_game_hour: baseEta, on_time: null })
      this.resequence()

      // Recalculate ETAs for remaining + new stop from current game time
      const remaining = this.manifest.slice(this.current_stop_index)
      if (remaining.length > 0) {
        const plan = planRoute(remaining, gameStore.company.date_tick)
        plan.stops.forEach((eta, i) => {
          const stop = this.manifest[this.current_stop_index + i]
          if (stop) stop.eta_game_hour = eta.arrival_game_hour
        })
      }

      this.active_event = null
    },

    scheduleDispatchEvent(event: DispatchEvent) {
      event.accepted = false
      event.job.status = 'pending'
      this.deferred_pickups.push(event.job)
      this.active_event = null
    },

    declineDispatchEvent(event: DispatchEvent) {
      event.accepted = false
      event.job.status = 'declined'
      this.active_event = null
    },

    queueDispatchEvent(event: DispatchEvent) {
      this.pending_events.push(event)
    },

    checkPendingEvents(currentTick: number) {
      if (this.active_event) return
      const ready = this.pending_events.find(e => e.fires_at_tick <= currentTick && e.accepted === null)
      if (ready) this.active_event = ready
    },

    resetDay() {
      this.phase = 'planning'
      this.manifest = []
      this.current_stop_index = 0
      this.pending_events = []
      this.active_event = null
      this.day_result = null
      this.available_jobs = []
    },
  },
})
