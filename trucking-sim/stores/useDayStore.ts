import { defineStore } from 'pinia'
import type { Job, ManifestStop, DayResult, DailyLedger, DispatchEvent, DayPhase, FleetRoute } from '~/types/game'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useRoutePlanner } from '~/composables/useRoutePlanner'
import { checkJobCompatibility } from '~/composables/useEquipmentCheck'

const BASE_LAT = 43.1009
const BASE_LNG = -75.2327
const BASE_ADDRESS = 'Utica Terminal – 200 Oriskany Blvd, Utica NY'
const RELAY_THRESHOLD = 0.85  // inject terminal return at 85% capacity
const MAX_SHIFT_HOURS = 10    // HOS practical daily limit
const AVG_STOP_H = 0.28       // avg hours per stop — 0.25h service + ~0.03h drive (Utica compact zone)
const RELAY_DWELL_H = 0.5     // 30-min cross-dock dwell per relay
const STEM_H = 0.5            // stem time estimate (first stop out + return leg)

export const useDayStore = defineStore('day', {
  state: () => ({
    // ── Global day state ──────────────────────────────────────────────────
    phase: 'planning' as DayPhase,
    available_jobs: [] as Job[],
    pending_events: [] as DispatchEvent[],
    active_event: null as DispatchEvent | null,
    day_result: null as DayResult | null,
    day_history: [] as DayResult[],
    deferred_pickups: [] as Job[],
    // ── Multi-truck fleet routes ──────────────────────────────────────────
    // Each owned truck that has been added to today's plan gets a FleetRoute entry.
    // selected_truck_id drives which route the MorningBoard is currently editing.
    fleet_routes: {} as Record<string, FleetRoute>,
    selected_truck_id: null as string | null,
  }),

  getters: {
    // ── Selected-route proxy getters (backward-compatible with Phase 0 callers) ──
    current_route(): FleetRoute | null {
      return this.selected_truck_id ? (this.fleet_routes[this.selected_truck_id] ?? null) : null
    },
    manifest(): ManifestStop[] {
      return this.current_route?.manifest ?? []
    },
    truck_id(): string | null {
      return this.selected_truck_id
    },
    driver_id(): string | null {
      return this.current_route?.driver_id ?? null
    },
    truck_capacity_lbs(): number {
      return this.current_route?.truck_capacity_lbs ?? 3500
    },
    truck_capacity_ft3(): number {
      return this.current_route?.truck_capacity_ft3 ?? 280
    },
    current_stop_index(): number {
      return this.current_route?.current_stop_index ?? 0
    },
    departure_hour(): number {
      return this.current_route?.departure_hour ?? 7
    },
    // ── Fleet-wide computed ────────────────────────────────────────────────
    all_routes_complete(): boolean {
      const routes = Object.values(this.fleet_routes)
      return routes.length > 0 && routes.every(r => r.route_phase === 'complete')
    },
    active_route_count(): number {
      return Object.values(this.fleet_routes).filter(r => r.route_phase === 'in_progress').length
    },
    configured_truck_ids(): string[] {
      return Object.keys(this.fleet_routes)
    },
    // ── Per-manifest computed (from selected route) ───────────────────────
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
      return this.wave_info.estimated_hours > MAX_SHIFT_HOURS
    },
    // Estimates wave breakdown for current manifest (pre- and post-optimization)
    wave_info(): { stops: number; waves: number; relays: number; estimated_hours: number } {
      const realStops = this.manifest.filter(s => s.stop_type !== 'terminal_return')
      const existingRelays = this.manifest.filter(s => s.stop_type === 'terminal_return')
      let waves: number
      let relays: number
      if (existingRelays.length > 0) {
        relays = existingRelays.length
        waves = relays + 1
      } else {
        const totalVolume = realStops.reduce((s, r) => s + r.job.volume_ft3, 0)
        const totalWeight = realStops.reduce((s, r) => s + r.job.weight_lbs, 0)
        waves = Math.max(
          Math.ceil(totalVolume / Math.max(1, this.truck_capacity_ft3 * RELAY_THRESHOLD)),
          Math.ceil(totalWeight / Math.max(1, this.truck_capacity_lbs * RELAY_THRESHOLD)),
          1,
        )
        relays = Math.max(0, waves - 1)
      }
      const estimated_hours = realStops.length * AVG_STOP_H + relays * RELAY_DWELL_H + waves * STEM_H
      return { stops: realStops.length, waves, relays, estimated_hours }
    },
    // Returns block reason string, or null if the job can be added
    job_block_reason(): (job: Job) => string | null {
      return (job: Job) => {
        // Equipment checks always block regardless of wave count
        if (this.truck_id) {
          const truck = useFleetStore().getTruckById(this.truck_id)
          if (truck) {
            const compat = checkJobCompatibility(job, truck)
            if (!compat.ok) return compat.reason ?? 'Equipment incompatible'
          }
        }
        // Time-based cap: estimate shift length with this job added
        const newStopCount = this.manifest.filter(s => s.stop_type !== 'terminal_return').length + 1
        const newVolume = this.manifest_volume_ft3 + job.volume_ft3
        const newWeight = this.manifest_weight_lbs + job.weight_lbs
        const relaysNeeded = Math.max(0, Math.max(
          Math.ceil(newVolume / Math.max(1, this.truck_capacity_ft3 * RELAY_THRESHOLD)) - 1,
          Math.ceil(newWeight / Math.max(1, this.truck_capacity_lbs * RELAY_THRESHOLD)) - 1,
        ))
        const estimatedHours = newStopCount * AVG_STOP_H + relaysNeeded * RELAY_DWELL_H + (relaysNeeded + 1) * STEM_H
        if (estimatedHours > MAX_SHIFT_HOURS) return `Shift full (~${estimatedHours.toFixed(1)}h)`
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
    // ── Route management ─────────────────────────────────────────────────────

    createRoute(truckId: string, driverId: string | null = null) {
      const fleetStore = useFleetStore()
      const truck = fleetStore.getTruckById(truckId)
      this.fleet_routes[truckId] = {
        truck_id: truckId,
        driver_id: driverId,
        manifest: [],
        current_stop_index: 0,
        departure_hour: 7,
        truck_capacity_lbs: truck?.max_weight_lbs ?? 3500,
        truck_capacity_ft3: truck?.volume_ft3 ?? 280,
        route_phase: 'pending',
        route_revenue: 0,
        route_late_penalties: 0,
        route_fuel_cost: 0,
      }
      if (!this.selected_truck_id) this.selected_truck_id = truckId
    },

    selectRoute(truckId: string) {
      if (this.fleet_routes[truckId]) this.selected_truck_id = truckId
    },

    removeRoute(truckId: string) {
      const route = this.fleet_routes[truckId]
      if (!route || route.route_phase !== 'pending') return
      for (const stop of route.manifest.filter(s => s.stop_type !== 'terminal_return')) {
        stop.job.status = 'pending'
        this.available_jobs.push(stop.job)
      }
      delete this.fleet_routes[truckId]
      if (this.selected_truck_id === truckId) {
        const remaining = Object.keys(this.fleet_routes)
        this.selected_truck_id = remaining[0] ?? null
      }
    },

    // ── Planning phase ────────────────────────────────────────────────────────

    startPlanningPhase(jobs: Job[]) {
      this.phase = 'planning'
      const { trucks } = useFleetStore()
      const actionable = trucks.length === 0
        ? jobs
        : jobs.filter(job => trucks.some(truck => checkJobCompatibility(job, truck).ok))
      this.available_jobs = [...this.deferred_pickups, ...actionable]
      this.deferred_pickups = []
      this.pending_events = []
      this.active_event = null
      this.day_result = null
      // Fresh routes for the new day — one per owned truck
      this.fleet_routes = {}
      this.selected_truck_id = null
      for (const truck of trucks) {
        this.createRoute(truck.id, truck.driver_id)
      }
    },

    addToManifest(job: Job) {
      const route = this.selected_truck_id ? this.fleet_routes[this.selected_truck_id] : null
      if (!route) return
      if (!this.can_add_job(job)) return
      if (route.manifest.find(s => s.job.id === job.id)) return
      job.status = 'on_manifest'
      route.manifest.push({ job, sequence: route.manifest.length + 1, eta_game_hour: 8 + route.manifest.length * 0.75, on_time: null })
      this.available_jobs = this.available_jobs.filter(j => j.id !== job.id)
      if (!job.job_type || job.job_type === 'delivery') {
        useNetworkStore().consumeDelivery(job.id)
      }
    },

    removeFromManifest(jobId: string) {
      const route = this.selected_truck_id ? this.fleet_routes[this.selected_truck_id] : null
      if (!route) return
      const stop = route.manifest.find(s => s.job.id === jobId)
      if (!stop) return
      stop.job.status = 'pending'
      route.manifest = route.manifest.filter(s => s.job.id !== jobId)
      this.available_jobs.push(stop.job)
      this._resequenceRoute(route)
      if (!stop.job.job_type || stop.job.job_type === 'delivery') {
        useNetworkStore().restoreDelivery(jobId)
      }
    },

    reorderManifest(fromIdx: number, toIdx: number) {
      const route = this.selected_truck_id ? this.fleet_routes[this.selected_truck_id] : null
      if (!route) return
      const stops = [...route.manifest]
      const moved = stops.splice(fromIdx, 1)[0]
      if (moved) stops.splice(toIdx, 0, moved)
      route.manifest = stops
      this._resequenceRoute(route)
    },

    _resequenceRoute(route: FleetRoute) {
      route.manifest.forEach((s, i) => { s.sequence = i + 1 })
    },

    resequence() {
      const route = this.selected_truck_id ? this.fleet_routes[this.selected_truck_id] : null
      if (route) this._resequenceRoute(route)
    },

    optimizeManifest(truckId?: string) {
      const targetId = truckId ?? this.selected_truck_id
      const route = targetId ? this.fleet_routes[targetId] : null
      if (!route) return

      const realStops = route.manifest.filter(s => s.stop_type !== 'terminal_return')
      if (realStops.length < 2) return

      const LAT_MILES = 69.0
      const LNG_MILES = 52.7
      const AVG_SPEED_MPH = 22
      const SERVICE_H = 0.25
      const DEPARTURE_H = 7

      let capLbs = route.truck_capacity_lbs
      let capFt3 = route.truck_capacity_ft3
      if (targetId) {
        const truck = useFleetStore().getTruckById(targetId)
        if (truck) { capLbs = truck.max_weight_lbs; capFt3 = truck.volume_ft3 }
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
      let lat = BASE_LAT, lng = BASE_LNG, hour = DEPARTURE_H
      let waveDeliveryLbs = 0, waveDeliveryFt3 = 0
      let pickupAccumLbs = 0, pickupAccumFt3 = 0
      let currentLeg = 1

      while (remaining.length > 0) {
        let bestIdx = 0, bestScore = Infinity
        for (let i = 0; i < remaining.length; i++) {
          const stop = remaining[i]!
          const d = dist(lat, lng, stop.job.delivery_lat, stop.job.delivery_lng)
          const eta = hour + d / AVG_SPEED_MPH
          const latePenalty = eta > stop.job.window_close ? (eta - stop.job.window_close) * 200 : 0
          const urgencyBonus = stop.job.window_close * 5
          if (d + latePenalty + urgencyBonus < bestScore) {
            bestScore = d + latePenalty + urgencyBonus
            bestIdx = i
          }
        }

        const chosen = remaining.splice(bestIdx, 1)[0]!
        const isPickup = chosen.job.job_type === 'pickup'

        const needsRelay = isPickup
          ? waveDeliveryLbs + pickupAccumLbs + chosen.job.weight_lbs > capLbs * RELAY_THRESHOLD ||
            waveDeliveryFt3 + pickupAccumFt3 + chosen.job.volume_ft3 > capFt3 * RELAY_THRESHOLD
          : waveDeliveryLbs + chosen.job.weight_lbs > capLbs * RELAY_THRESHOLD ||
            waveDeliveryFt3 + chosen.job.volume_ft3 > capFt3 * RELAY_THRESHOLD

        if (needsRelay && remaining.length > 0) {
          remaining.push(chosen)
          const dToTerminal = dist(lat, lng, BASE_LAT, BASE_LNG)
          ordered.push(makeTerminalReturn(currentLeg))
          hour += dToTerminal / AVG_SPEED_MPH + RELAY_DWELL_H
          lat = BASE_LAT; lng = BASE_LNG
          waveDeliveryLbs = 0; waveDeliveryFt3 = 0
          pickupAccumLbs = 0; pickupAccumFt3 = 0
          currentLeg++
          continue
        }

        if (isPickup) {
          pickupAccumLbs += chosen.job.weight_lbs
          pickupAccumFt3 += chosen.job.volume_ft3
        } else {
          waveDeliveryLbs += chosen.job.weight_lbs
          waveDeliveryFt3 += chosen.job.volume_ft3
        }

        const dToChosen = dist(lat, lng, chosen.job.delivery_lat, chosen.job.delivery_lng)
        hour += dToChosen / AVG_SPEED_MPH + SERVICE_H
        lat = chosen.job.delivery_lat
        lng = chosen.job.delivery_lng
        ordered.push({ ...chosen, leg: currentLeg })
      }

      route.manifest = ordered
      this._resequenceRoute(route)
    },

    optimizeAllRoutes() {
      for (const truckId of Object.keys(this.fleet_routes)) {
        this.optimizeManifest(truckId)
      }
    },

    // ── Dispatch ──────────────────────────────────────────────────────────────

    // Phase 0 compat: single-truck dispatch. Creates route if not yet present.
    startDay(truckId: string, driverId: string) {
      const gameStore = useGameStore()
      const fleetStore = useFleetStore()
      const { planRoute } = useRoutePlanner()

      if (!this.fleet_routes[truckId]) this.createRoute(truckId, driverId)
      const route = this.fleet_routes[truckId]!

      this.phase = 'in_progress'
      this.selected_truck_id = truckId
      route.driver_id = driverId
      route.route_phase = 'in_progress'
      route.current_stop_index = 0
      route.departure_hour = gameStore.company.date_tick

      const truck = fleetStore.getTruckById(truckId)
      if (truck) {
        route.truck_capacity_lbs = truck.max_weight_lbs
        route.truck_capacity_ft3 = truck.volume_ft3
      }

      if (route.manifest.length > 0) {
        const plan = planRoute(route.manifest, route.departure_hour)
        plan.stops.forEach((eta, i) => {
          if (route.manifest[i]) route.manifest[i]!.eta_game_hour = eta.arrival_game_hour
        })
      }

      fleetStore.assignDriverToTruck(driverId, truckId)
      fleetStore.setTruckPhase0Status(truckId, 'EN_ROUTE')
      fleetStore.updateDriverHOS(driverId, { status: 'Driving' })
    },

    // Phase 1: dispatch all configured routes concurrently.
    startFleetDay() {
      const gameStore = useGameStore()
      const fleetStore = useFleetStore()
      const { planRoute } = useRoutePlanner()

      this.phase = 'in_progress'
      for (const [truckId, route] of Object.entries(this.fleet_routes)) {
        if (route.manifest.filter(s => s.stop_type !== 'terminal_return').length === 0) continue
        route.route_phase = 'in_progress'
        route.current_stop_index = 0
        route.departure_hour = gameStore.company.date_tick
        const truck = fleetStore.getTruckById(truckId)
        if (truck) {
          route.truck_capacity_lbs = truck.max_weight_lbs
          route.truck_capacity_ft3 = truck.volume_ft3
        }
        if (route.manifest.length > 0) {
          const plan = planRoute(route.manifest, route.departure_hour)
          plan.stops.forEach((eta, i) => {
            if (route.manifest[i]) route.manifest[i]!.eta_game_hour = eta.arrival_game_hour
          })
        }
        if (route.driver_id) {
          fleetStore.assignDriverToTruck(route.driver_id, truckId)
          fleetStore.setTruckPhase0Status(truckId, 'EN_ROUTE')
          fleetStore.updateDriverHOS(route.driver_id, { status: 'Driving' })
        }
      }
    },

    // ── In-route ─────────────────────────────────────────────────────────────

    // truckId selects which route's stop to advance. Defaults to selected_truck_id.
    completeStop(gameHour: number, truckId?: string) {
      const targetId = truckId ?? this.selected_truck_id
      const route = targetId ? this.fleet_routes[targetId] : null
      if (!route) return
      const stop = route.manifest[route.current_stop_index]
      if (!stop) return
      stop.job.status = 'delivered'
      stop.on_time = gameHour <= stop.eta_game_hour + 0.25
      route.current_stop_index++
      // Clear the dock item so it doesn't accumulate overnight
      if (stop.job.job_type === 'delivery') {
        useNetworkStore().markDelivered(stop.job.id)
      }
    },

    // Settle a single route and mark it complete (called by app.vue per-truck loop).
    completeRoute(truckId: string) {
      const route = this.fleet_routes[truckId]
      if (!route || route.route_phase === 'complete') return
      const relayStops = route.manifest.filter(s => s.stop_type === 'terminal_return')
      const delivered = route.manifest.filter(s => s.stop_type !== 'terminal_return' && s.job.status === 'delivered')
      const revenue = delivered.reduce((sum, s) => sum + s.job.payout, 0)
      const latePenalties = delivered.filter(s => s.on_time === false).length * 25
      const relayCount = relayStops.length
      const estimatedMiles = route.manifest.filter(s => s.stop_type !== 'terminal_return').length * 3.5 + relayCount * 5 + 8
      const fuelCost = Math.max(8, Math.round(estimatedMiles / 15 * 4.20))
      route.route_revenue = revenue
      route.route_late_penalties = latePenalties
      route.route_fuel_cost = fuelCost
      // Restore undelivered stops back to available on the dock so they re-enter
      // the job board the next morning (driver ran out of HOS or day ended early)
      const networkStore = useNetworkStore()
      const undelivered = route.manifest.filter(
        s => s.stop_type !== 'terminal_return' && s.job.status !== 'delivered'
      )
      for (const s of undelivered) {
        s.job.status = 'pending'
        networkStore.restoreDelivery(s.job.id)
      }

      route.route_phase = 'complete'
      const fleetStore = useFleetStore()
      fleetStore.setTruckPhase0Status(truckId, 'Idle')
      if (route.driver_id) {
        // Clear assignment so the driver re-enters the available pool for hub-to-hub contracts
        fleetStore.updateDriverHOS(route.driver_id, { status: 'Available', assigned_truck_id: null })
        const truck = fleetStore.getTruckById(truckId)
        if (truck) truck.driver_id = null
      }
    },

    // Aggregate all routes and produce the DayResult. Call when all_routes_complete === true.
    finishDay(currentTick: number, dayNumber: number) {
      const routes = Object.values(this.fleet_routes)
      const activeRoutes = routes.filter(r => r.route_phase !== 'pending')
      const source = activeRoutes.length > 0 ? activeRoutes : routes

      let totalRevenue = 0, totalLatePenalties = 0, totalFuelCost = 0
      let totalAttempted = 0, totalDelivered = 0, totalFailed = 0
      let allLats: number[] = [], allLngs: number[] = []
      let totalRelays = 0, totalWaves = 0

      for (const route of source) {
        const realStops = route.manifest.filter(s => s.stop_type !== 'terminal_return')
        const relayStops = route.manifest.filter(s => s.stop_type === 'terminal_return')
        const delivered = realStops.filter(s => s.job.status === 'delivered')
        const failed = realStops.filter(s => s.job.status !== 'delivered')
        const revenue = delivered.reduce((sum, s) => sum + s.job.payout, 0)
        const latePenalties = delivered.filter(s => s.on_time === false).length * 25
        const relayCount = relayStops.length
        const estimatedMiles = realStops.length * 3.5 + relayCount * 5 + 8
        const fuelCost = Math.max(8, Math.round(estimatedMiles / 15 * 4.20))
        totalRevenue += revenue
        totalLatePenalties += latePenalties
        totalFuelCost += fuelCost
        totalAttempted += realStops.length
        totalDelivered += delivered.length
        totalFailed += failed.length
        totalRelays += relayCount
        totalWaves += relayCount + 1
        allLats.push(...realStops.map(s => s.job.delivery_lat))
        allLngs.push(...realStops.map(s => s.job.delivery_lng))
      }

      const gameStore = useGameStore()
      const fleetStore = useFleetStore()
      const networkStore = useNetworkStore()
      gameStore.deductCash(totalFuelCost, 'fuel')

      // ── Daily ledger ──────────────────────────────────────────────────────
      // Split revenue by job type
      let revenuePD = 0, revenuePickups = 0
      for (const route of source) {
        const delivered = route.manifest.filter(s => s.stop_type !== 'terminal_return' && s.job.status === 'delivered')
        const latePenaltyCount = delivered.filter(s => s.on_time === false).length
        for (const s of delivered) {
          if (!s.job.job_type || s.job.job_type === 'delivery') revenuePD += s.job.payout
          else revenuePickups += s.job.payout
        }
        revenuePD -= latePenaltyCount * 25
      }

      // Payroll: settleDriverPayroll (called in handleStartNewDay) charges ALL hired drivers
      // their daily_wage regardless of whether they ran. We report it here for the ledger
      // without double-deducting — those deductions happen in settleDriverPayroll and per-tick wages.
      const activeDriverIds = new Set(
        Object.values(this.fleet_routes)
          .filter(r => r.route_phase !== 'pending')
          .map(r => r.driver_id)
          .filter(Boolean) as string[]
      )
      const hiredDrivers = fleetStore.drivers.filter(d => !d.is_owner_op && d.daily_wage > 0)
      // Active drivers already paid per-tick; idle drivers cost their daily guaranteed rate
      const expensePayroll = hiredDrivers
        .filter(d => activeDriverIds.has(d.id))
        .reduce((sum, d) => sum + d.daily_wage, 0)
      const idleHired = hiredDrivers.filter(d => !activeDriverIds.has(d.id))
      // $50/day standby minimum for idle hired drivers (charged here; settleDriverPayroll charges full wage)
      const expenseStandby = idleHired.reduce((sum, d) => sum + d.daily_wage, 0)

      const expenseDemurrage = networkStore.computeDemurrageTotal(dayNumber)
      const expenseCongestion = networkStore.applyCongestionPenalty()

      const ledger: DailyLedger = {
        revenue_pd: Math.max(0, revenuePD),
        revenue_pickups: revenuePickups,
        expense_payroll: expensePayroll,
        expense_standby: expenseStandby,
        expense_fuel: totalFuelCost,
        expense_demurrage: expenseDemurrage,
        expense_congestion: expenseCongestion,
        net_profit: Math.max(0, revenuePD) + revenuePickups
          - expensePayroll - expenseStandby - totalFuelCost - expenseDemurrage - expenseCongestion,
      }

      const spread = allLats.length > 1
        ? Math.sqrt((Math.max(...allLats) - Math.min(...allLats)) ** 2 + (Math.max(...allLngs) - Math.min(...allLngs)) ** 2)
        : 0

      const result: DayResult = {
        day: dayNumber,
        date_tick_start: currentTick,
        jobs_attempted: totalAttempted,
        jobs_delivered: totalDelivered,
        jobs_failed: totalFailed,
        jobs_declined: this.available_jobs.length,
        revenue: totalRevenue,
        late_penalties: totalLatePenalties,
        fuel_cost: totalFuelCost,
        density_score: Math.max(0, Math.round(100 - spread * 2000)),
        // Stem = 15 min out + 15 min back + ~7 min between stops
        stem_time_hours: totalAttempted > 0
          ? Math.round((0.25 + 0.25 + Math.max(0, totalAttempted - 1) * 0.12) * 10) / 10
          : 0,
        in_zone_hours: Math.round(totalDelivered * 0.4 * 10) / 10,
        wave_count: totalWaves,
        relay_count: totalRelays,
        ledger,
      }
      this.day_result = result
      this.day_history.push(result)
      this.phase = 'debrief'
    },

    // ── Dispatch events (in-route pickups) ────────────────────────────────────

    acceptDispatchEvent(event: DispatchEvent) {
      const { planRoute } = useRoutePlanner()
      const gameStore = useGameStore()
      const route = this.selected_truck_id ? this.fleet_routes[this.selected_truck_id] : null
      if (!route) return

      event.accepted = true
      event.job.status = 'on_manifest'

      const lastStop = route.manifest[route.manifest.length - 1]
      const baseEta = lastStop ? lastStop.eta_game_hour + 0.5 : gameStore.company.date_tick + 0.5
      route.manifest.push({ job: event.job, sequence: route.manifest.length + 1, eta_game_hour: baseEta, on_time: null })
      this._resequenceRoute(route)

      // Recalculate ETAs only for stops AFTER the current in-progress stop.
      // Overwriting the current stop's ETA would reset it to a future value and
      // break the tick handler's completion condition, freezing the truck in LOADING.
      const postCurrent = route.manifest.slice(route.current_stop_index + 1)
      if (postCurrent.length > 0) {
        const { updateETAs } = useRoutePlanner()
        const currentStop = route.manifest[route.current_stop_index]
        const fromLat = currentStop?.job.delivery_lat ?? BASE_LAT
        const fromLng = currentStop?.job.delivery_lng ?? BASE_LNG
        const svcH = currentStop?.stop_type === 'terminal_return' ? 0.5 : 0.25
        const fromHour = currentStop
          ? currentStop.eta_game_hour + svcH
          : gameStore.company.date_tick
        updateETAs(postCurrent, fromLat, fromLng, fromHour)
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
      const ready = this.pending_events.find(
        e => e.fires_at_tick <= currentTick && e.expires_at_tick > currentTick && e.accepted === null
      )
      if (ready) this.active_event = ready
    },

    clearWeekHistory() {
      this.day_history = []
    },

    resetDay() {
      this.phase = 'planning'
      this.fleet_routes = {}
      this.selected_truck_id = null
      this.pending_events = []
      this.active_event = null
      this.day_result = null
      this.available_jobs = []
    },
  },
})
