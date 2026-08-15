import { defineStore } from 'pinia'
import type { Job, ManifestStop, DayResult, DispatchEvent, DayPhase } from '~/types/game'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useRoutePlanner } from '~/composables/useRoutePlanner'
import { checkJobCompatibility } from '~/composables/useEquipmentCheck'

const BASE_LAT = 43.1009
const BASE_LNG = -75.2327
const BASE_ADDRESS = 'Utica Terminal – 200 Oriskany Blvd, Utica NY'
const RELAY_THRESHOLD = 0.85  // inject terminal return at 85% pickup capacity

export const useDayStore = defineStore('day', {
  state: () => ({
    phase: 'planning' as DayPhase,
    available_jobs: [] as Job[],
    manifest: [] as ManifestStop[],
    truck_id: null as string | null,
    driver_id: null as string | null,
    truck_capacity_lbs: 3500,   // set from selected truck in startDay
    truck_capacity_ft3: 280,
    current_stop_index: 0,
    pending_events: [] as DispatchEvent[],
    active_event: null as DispatchEvent | null,
    day_result: null as DayResult | null,
    base_lat: BASE_LAT,
    base_lng: BASE_LNG,
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
      return Math.min(100, (this.manifest_weight_lbs / this.truck_capacity_lbs) * 100)
    },
    volume_pct(): number {
      return Math.min(100, (this.manifest_volume_ft3 / this.truck_capacity_ft3) * 100)
    },
    is_over_capacity(): boolean {
      return this.manifest_weight_lbs > this.truck_capacity_lbs || this.manifest_volume_ft3 > this.truck_capacity_ft3
    },
    // Returns block reason string, or null if the job can be added
    job_block_reason(): (job: Job) => string | null {
      return (job: Job) => {
        if (this.manifest_weight_lbs + job.weight_lbs > this.truck_capacity_lbs) return 'Over weight capacity'
        if (this.manifest_volume_ft3 + job.volume_ft3 > this.truck_capacity_ft3) return 'Over volume capacity'
        if (this.truck_id) {
          const truck = useFleetStore().getTruckById(this.truck_id)
          if (truck) {
            const compat = checkJobCompatibility(job, truck)
            if (!compat.ok) return compat.reason ?? 'Equipment incompatible'
          }
        }
        return null
      }
    },
    can_add_job(): (job: Job) => boolean {
      return (job: Job) => this.job_block_reason(job) === null
    },
    capacity_lbs(): number { return this.truck_capacity_lbs },
    capacity_ft3(): number { return this.truck_capacity_ft3 },
  },

  actions: {
    startPlanningPhase(jobs: Job[]) {
      this.phase = 'planning'
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
      if (!stop.job.job_type || stop.job.job_type === 'delivery') {
        useNetworkStore().restoreDelivery(jobId)
      }
    },

    reorderManifest(fromIdx: number, toIdx: number) {
      const stops = [...this.manifest]
      const moved = stops.splice(fromIdx, 1)[0]
      if (moved) stops.splice(toIdx, 0, moved)
      this.manifest = stops
      this.resequence()
    },

    resequence() {
      this.manifest.forEach((s, i) => { s.sequence = i + 1 })
    },

    optimizeManifest(truckId?: string) {
      // Remove existing terminal_return stubs before re-optimizing
      const realStops = this.manifest.filter(s => s.stop_type !== 'terminal_return')
      if (realStops.length < 2) return

      const LAT_MILES = 69.0
      const LNG_MILES = 52.7
      const AVG_SPEED_MPH = 22
      const SERVICE_H = 0.25
      const DEPARTURE_H = 7

      // Resolve truck capacity — fall back to state (set from last startDay)
      const resolvedTruckId = truckId ?? this.truck_id
      let capLbs = this.truck_capacity_lbs
      let capFt3 = this.truck_capacity_ft3
      if (resolvedTruckId) {
        const truck = useFleetStore().getTruckById(resolvedTruckId)
        if (truck) {
          capLbs = truck.max_weight_lbs
          capFt3 = truck.volume_ft3
        }
      }

      function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const dLat = (lat2 - lat1) * LAT_MILES
        const dLng = (lng2 - lng1) * LNG_MILES
        return Math.sqrt(dLat ** 2 + dLng ** 2)
      }

      function makeTerminalReturn(leg: number): ManifestStop {
        return {
          job: {
            id: `terminal-return-leg${leg}`,
            job_type: 'delivery',
            customer_name: 'Terminal Cross-Dock',
            pickup_address: BASE_ADDRESS,
            delivery_address: BASE_ADDRESS,
            pickup_lat: BASE_LAT,
            pickup_lng: BASE_LNG,
            delivery_lat: BASE_LAT,
            delivery_lng: BASE_LNG,
            weight_lbs: 0,
            volume_ft3: 0,
            payout: 0,
            window_open: 0,
            window_close: 24,
            delivery_type: 'commercial',
            equipment_tags: [],
            status: 'pending',
          },
          sequence: 0,
          eta_game_hour: 0,
          on_time: null,
          stop_type: 'terminal_return',
          leg,
        }
      }

      const remaining = [...realStops]
      const ordered: ManifestStop[] = []
      let lat = BASE_LAT
      let lng = BASE_LNG
      let hour = DEPARTURE_H
      let pickupWeightAccum = 0
      let pickupVolumeAccum = 0
      let currentLeg = 1

      while (remaining.length > 0) {
        let bestIdx = 0
        let bestScore = Infinity

        for (let i = 0; i < remaining.length; i++) {
          const stop = remaining[i]!
          const d = dist(lat, lng, stop.job.delivery_lat, stop.job.delivery_lng)
          const eta = hour + d / AVG_SPEED_MPH
          const latePenalty = eta > stop.job.window_close ? (eta - stop.job.window_close) * 200 : 0
          const urgencyBonus = stop.job.window_close * 5
          const score = d + latePenalty + urgencyBonus
          if (score < bestScore) {
            bestScore = score
            bestIdx = i
          }
        }

        const chosen = remaining.splice(bestIdx, 1)[0]!
        const dToChosen = dist(lat, lng, chosen.job.delivery_lat, chosen.job.delivery_lng)

        if (chosen.job.job_type === 'pickup') {
          pickupWeightAccum += chosen.job.weight_lbs
          pickupVolumeAccum += chosen.job.volume_ft3
        }

        // Inject terminal relay when accumulated pickups hit 85% of truck capacity,
        // but only when more stops remain — no relay needed as the final act.
        const needsRelay = (
          pickupWeightAccum >= capLbs * RELAY_THRESHOLD ||
          pickupVolumeAccum >= capFt3 * RELAY_THRESHOLD
        ) && remaining.length > 0

        if (needsRelay) {
          ordered.push({ ...chosen, leg: currentLeg })
          const dToTerminal = dist(chosen.job.delivery_lat, chosen.job.delivery_lng, BASE_LAT, BASE_LNG)
          ordered.push(makeTerminalReturn(currentLeg))
          // Advance clock: drive to chosen stop + service + drive back + 45-min cross-dock
          hour += dToChosen / AVG_SPEED_MPH + SERVICE_H + dToTerminal / AVG_SPEED_MPH + 0.75
          lat = BASE_LAT
          lng = BASE_LNG
          pickupWeightAccum = 0
          pickupVolumeAccum = 0
          currentLeg++
          continue
        }

        hour += dToChosen / AVG_SPEED_MPH + SERVICE_H
        lat = chosen.job.delivery_lat
        lng = chosen.job.delivery_lng
        ordered.push({ ...chosen, leg: currentLeg })
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

      // Lock in truck capacity for this route
      const truck = fleetStore.getTruckById(truckId)
      if (truck) {
        this.truck_capacity_lbs = truck.max_weight_lbs
        this.truck_capacity_ft3 = truck.volume_ft3
      }

      if (this.manifest.length > 0) {
        const plan = planRoute(this.manifest, this.departure_hour)
        plan.stops.forEach((eta, i) => {
          if (this.manifest[i]) {
            this.manifest[i]!.eta_game_hour = eta.arrival_game_hour
          }
        })
      }

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
      // Exclude synthetic terminal_return stops from job accounting
      const realStops = this.manifest.filter(s => s.stop_type !== 'terminal_return')
      const delivered = realStops.filter(s => s.job.status === 'delivered')
      const failed = realStops.filter(s => s.job.status !== 'delivered')
      const revenue = delivered.reduce((sum, s) => sum + s.job.payout, 0)
      const latePenalties = delivered.filter(s => s.on_time === false).length * 25
      const lats = realStops.map(s => s.job.delivery_lat)
      const lngs = realStops.map(s => s.job.delivery_lng)
      const latSpread = realStops.length > 1 ? Math.max(...lats) - Math.min(...lats) : 0
      const lngSpread = realStops.length > 1 ? Math.max(...lngs) - Math.min(...lngs) : 0
      const spread = Math.sqrt(latSpread * latSpread + lngSpread * lngSpread)
      this.day_result = {
        day: dayNumber,
        date_tick_start: currentTick,
        jobs_attempted: realStops.length,
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

      const lastStop = this.manifest[this.manifest.length - 1]
      const baseEta = lastStop ? lastStop.eta_game_hour + 0.5 : gameStore.company.date_tick + 0.5
      this.manifest.push({ job: event.job, sequence: this.manifest.length + 1, eta_game_hour: baseEta, on_time: null })
      this.resequence()

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
