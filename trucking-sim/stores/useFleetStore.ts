import { defineStore } from 'pinia'
import type { Truck, Driver, LicenseClass, HireableDriver } from '~/types/game'
import { INITIAL_TRUCKS, INITIAL_DRIVERS } from '~/data/terminals'
import type { VehicleListing } from '~/data/vehicles'
import { useGameStore } from '~/stores/useGameStore'
import { useDayStore } from '~/stores/useDayStore'

const LICENSE_RANK: Record<LicenseClass, number> = { CLASS_C: 0, CLASS_B: 1, CLASS_A: 2 }

const LICENSE_TO_CLASS: Record<string, LicenseClass> = {
  'non-cdl': 'CLASS_C',
  'CDL-B':   'CLASS_B',
  'CDL-A':   'CLASS_A',
}

// Fictional Utica-area driver name pool — 8 entries, cycled by day number
const DRIVER_POOL_SEED: Omit<HireableDriver, 'id' | 'available_from_day'>[] = [
  { name: 'Mike Ferraro',     daily_wage: 140, skill_rating: 3, class_license: 'non-cdl' },
  { name: 'Donna Kaminski',   daily_wage: 185, skill_rating: 4, class_license: 'CDL-B'   },
  { name: 'Ray Pellegrino',   daily_wage: 220, skill_rating: 5, class_license: 'CDL-A'   },
  { name: 'Josh Ostrowski',   daily_wage: 120, skill_rating: 2, class_license: 'non-cdl' },
  { name: 'Theresa Buonanno', daily_wage: 135, skill_rating: 3, class_license: 'non-cdl' },
  { name: 'Sal Marotta',      daily_wage: 175, skill_rating: 4, class_license: 'CDL-B'   },
  { name: 'Chris Zielinski',  daily_wage: 158, skill_rating: 3, class_license: 'CDL-B'   },
  { name: 'Angela Coyne',     daily_wage: 215, skill_rating: 5, class_license: 'CDL-A'   },
]

export const useFleetStore = defineStore('fleet', {
  state: () => ({
    fleet: [...INITIAL_TRUCKS] as Truck[],
    drivers: [...INITIAL_DRIVERS] as Driver[],
    driver_pool: [] as HireableDriver[],
  }),

  getters: {
    trucks(): Truck[] {
      return this.fleet.filter((t): t is Truck => t.type === 'truck')
    },

    idleTrucks(): Truck[] {
      return this.trucks.filter(t => t.status === 'Idle' && !t.maintenance_due)
    },

    activeTrucks(): Truck[] {
      return this.trucks.filter(t => t.status === 'In Transit')
    },

    availableDrivers(): Driver[] {
      return this.drivers.filter(d => d.status === 'Available' && d.assigned_truck_id === null)
    },

    getTruckById(): (id: string) => Truck | undefined {
      return (id: string) => this.trucks.find(t => t.id === id)
    },

    getDriverById(): (id: string) => Driver | undefined {
      return (id: string) => this.drivers.find(d => d.id === id)
    },

    getDriverForTruck(): (truckId: string) => Driver | undefined {
      return (truckId: string) => this.drivers.find(d => d.assigned_truck_id === truckId)
    },
  },

  actions: {
    purchaseVehicle(listing: VehicleListing): boolean {
      const gameStore = useGameStore()
      if (gameStore.company.cash < listing.price) return false

      const id = `truck-${Math.random().toString(36).slice(2, 8)}`
      const truck: Truck = {
        id,
        type: 'truck',
        mode: 'ground',
        truck_type: listing.truck_type,
        name: listing.name,
        status: 'Idle',
        max_weight_lbs: listing.max_weight_lbs,
        volume_ft3: listing.volume_ft3,
        has_liftgate: listing.has_liftgate,
        has_dock_access: listing.has_dock_access,
        mpg: listing.mpg,
        fuel_level: listing.fuel_capacity,
        fuel_capacity: listing.fuel_capacity,
        odometer: 0,
        condition: 100,
        driver_id: null,
        progress: 0,
        payload_lbs: 0,
        origin_hub_id: 'z-downtown',
        target_hub_id: null,
        route_geometry: null,
        route_distance_miles: 0,
        delay_hours_remaining: 0,
        maintenance_due: false,
        required_license: listing.required_license,
        resale_value: listing.resale_value,
      }

      gameStore.deductCash(listing.price, 'vehicle', id)
      this.fleet.push(truck)

      // First purchase: add "You (Owner-Op)" as a free driver with CLASS_A license
      if (this.drivers.length === 0) {
        this.drivers.push({
          id: 'driver-you',
          name: 'You (Owner-Op)',
          wage_per_hr: 0,
          daily_wage: 0,
          license_class: 'CLASS_A',
          is_owner_op: true,
          status: 'Available',
          assigned_truck_id: null,
          hos_drive_remaining: 11,
          hos_onduty_remaining: 14,
          hos_reset_remaining: 0,
        })
      }

      // Phase advancement: buying a box truck→phase 1, day cab→phase 2, semi→phase 3
      gameStore.setPhase(listing.phase)

      return true
    },

    // Sell a vehicle: return resale value, unassign driver, remove from fleet.
    // The driver stays on payroll — player must reassign or fire them separately.
    sellVehicle(vehicleId: string) {
      const gameStore = useGameStore()
      const truck = this.fleet.find(t => t.id === vehicleId)
      if (!truck || truck.status === 'EN_ROUTE' || truck.status === 'LOADING') return false
      // Unassign driver first
      if (truck.driver_id) {
        const driver = this.drivers.find(d => d.id === truck.driver_id)
        if (driver) {
          driver.assigned_truck_id = null
          driver.status = 'Available'
        }
      }
      gameStore.addCash(truck.resale_value ?? 0, `sold-${vehicleId}`)
      this.fleet = this.fleet.filter(t => t.id !== vehicleId)
      return true
    },

    // Link a driver to a vehicle. Enforces license compatibility.
    // Returns { ok: boolean; reason?: string }
    assignDriverToVehicle(driverId: string, vehicleId: string): { ok: boolean; reason?: string } {
      const driver = this.drivers.find(d => d.id === driverId)
      const truck = this.fleet.find(t => t.id === vehicleId)
      if (!driver || !truck) return { ok: false, reason: 'Not found' }
      const driverRank = LICENSE_RANK[driver.license_class ?? 'CLASS_C']
      const truckRank = LICENSE_RANK[truck.required_license ?? 'CLASS_C']
      if (driverRank < truckRank) {
        return { ok: false, reason: `Requires ${truck.required_license} — driver holds ${driver.license_class}` }
      }
      // Unlink previous assignments first
      if (truck.driver_id && truck.driver_id !== driverId) {
        const prev = this.drivers.find(d => d.id === truck.driver_id)
        if (prev) { prev.assigned_truck_id = null; prev.status = 'Available' }
      }
      if (driver.assigned_truck_id && driver.assigned_truck_id !== vehicleId) {
        const prevTruck = this.fleet.find(t => t.id === driver.assigned_truck_id)
        if (prevTruck) prevTruck.driver_id = null
      }
      driver.assigned_truck_id = vehicleId
      driver.status = 'Available'
      truck.driver_id = driverId
      return { ok: true }
    },

    // Safely unlink a driver from their current vehicle without removing either.
    unassignDriver(driverId: string) {
      const driver = this.drivers.find(d => d.id === driverId)
      if (!driver || !driver.assigned_truck_id) return
      const truck = this.fleet.find(t => t.id === driver.assigned_truck_id)
      if (truck) truck.driver_id = null
      driver.assigned_truck_id = null
      driver.status = 'Available'
    },

    // Remove a hired driver from the roster. Owner-op is protected.
    serviceTruck(truckId: string): number {
      const truck = this.fleet.find(t => t.id === truckId)
      if (!truck || !truck.maintenance_due) return 0
      const cost = Math.max(150, Math.round(truck.odometer * 0.008 + 80))
      const gameStore = useGameStore()
      if (gameStore.company.cash < cost) return 0
      gameStore.deductCash(cost, 'maintenance')
      truck.maintenance_due = false
      truck.condition = Math.min(100, truck.condition + 30)
      if (truck.status === 'Out of Service') truck.status = 'Idle'
      return cost
    },

    fireDriver(driverId: string) {
      const driver = this.drivers.find(d => d.id === driverId)
      if (!driver || driver.is_owner_op) return
      this.unassignDriver(driverId)
      this.drivers = this.drivers.filter(d => d.id !== driverId)
    },

    assignDriverToTruck(driverId: string, truckId: string) {
      const driver = this.drivers.find(d => d.id === driverId)
      const truck = this.fleet.find(t => t.id === truckId)
      if (!driver || !truck) return
      driver.assigned_truck_id = truckId
      driver.status = 'Available'
      truck.driver_id = driverId
    },

    dispatchTruck(truckId: string, targetHubId: string, payloadLbs: number, routeGeometry: [number, number][], distanceMiles: number) {
      const truck = this.fleet.find(t => t.id === truckId)
      const driver = this.drivers.find(d => d.assigned_truck_id === truckId)
      if (!truck || !driver) return

      truck.status = 'In Transit'
      truck.target_hub_id = targetHubId
      truck.payload_lbs = payloadLbs
      truck.progress = 0
      truck.route_geometry = routeGeometry
      truck.route_distance_miles = distanceMiles
      truck.delay_hours_remaining = 0

      driver.status = 'Driving'
    },

    updateTruckProgress(truckId: string, updates: Partial<Truck>) {
      const idx = this.fleet.findIndex(t => t.id === truckId)
      if (idx === -1) return
      const truck = this.fleet[idx]
      if (truck) Object.assign(truck, updates)
    },

    updateDriverHOS(driverId: string, updates: Partial<Driver>) {
      const idx = this.drivers.findIndex(d => d.id === driverId)
      if (idx === -1) return
      const driver = this.drivers[idx]
      if (driver) Object.assign(driver, updates)
    },

    returnTruckToIdle(truckId: string) {
      const truck = this.fleet.find(t => t.id === truckId)
      const driver = this.drivers.find(d => d.assigned_truck_id === truckId)
      if (!truck) return

      const arrivedAt = truck.target_hub_id!
      truck.status = truck.maintenance_due ? 'Out of Service' : 'Idle'
      truck.origin_hub_id = arrivedAt
      truck.target_hub_id = null
      truck.progress = 0
      truck.payload_lbs = 0
      truck.route_geometry = null
      truck.route_distance_miles = 0

      if (driver) {
        driver.status = 'Available'
        driver.assigned_truck_id = null
      }
      truck.driver_id = null
    },

    forceDriverOffDuty(driverId: string) {
      const driver = this.drivers.find(d => d.id === driverId)
      if (!driver) return
      driver.status = 'Off Duty'
      driver.hos_reset_remaining = 10
      if (driver.assigned_truck_id) {
        const truck = this.fleet.find(t => t.id === driver.assigned_truck_id)
        if (truck) truck.status = 'Idle'
      }
    },

    completeHOSReset(driverId: string) {
      const driver = this.drivers.find(d => d.id === driverId)
      if (!driver) return
      driver.hos_drive_remaining = 11
      driver.hos_onduty_remaining = 14
      driver.hos_reset_remaining = 0
      driver.status = 'Available'
    },

    // Used by Phase-0 P&D loop to sync truck status with day route state.
    // Separate from dispatchTruck (which is for Phase-1 hub-to-hub contracts).
    setTruckPhase0Status(truckId: string, status: 'EN_ROUTE' | 'LOADING' | 'Idle') {
      const truck = this.fleet.find(t => t.id === truckId)
      if (truck) truck.status = status
    },

    // Full end-of-shift cleanup for Phase-0 routes.
    // Idles the truck, unassigns the driver, and restores full HOS for the next day.
    endPhase0Route(truckId: string, driverId: string) {
      const truck = this.fleet.find(t => t.id === truckId)
      const driver = this.drivers.find(d => d.id === driverId)
      if (truck) {
        truck.status = 'Idle'
        truck.driver_id = null
      }
      if (driver) {
        driver.assigned_truck_id = null
        driver.status = 'Available'
        driver.hos_drive_remaining = 11
        driver.hos_onduty_remaining = 14
        driver.hos_reset_remaining = 0
      }
    },

    // ── Phantom Route Guard ───────────────────────────────────────────────────
    // Called after hydrating saved state. If a truck is stuck in a driving/loading
    // status but no day route is actively running, it's orphaned — reset it.
    validatePhantomRoutes(dayPhase: string) {
      if (dayPhase === 'in_progress') return
      for (const truck of this.fleet) {
        if (truck.status === 'EN_ROUTE' || truck.status === 'LOADING') {
          truck.status = 'Idle'
          truck.driver_id = null
        }
        // Heal persisted trucks that predate the volume_ft3 field (schema migration)
        if (truck.volume_ft3 == null || isNaN(truck.volume_ft3 as number)) {
          // Default by truck type — Box Truck / Van = 280 ft³, larger trucks get more
          const defaults: Record<string, number> = { 'Box Truck': 280, 'Day Cab': 450, 'Semi': 1800, 'Flatbed': 1400, 'Reefer': 1600 }
          truck.volume_ft3 = defaults[truck.truck_type] ?? 280
        }
      }
      for (const driver of this.drivers) {
        if (driver.status === 'Driving') {
          driver.status = 'Available'
          driver.assigned_truck_id = null
        }
      }
    },

    // Manual unstick for a specific truck — callable from Fleet modal UI
    unstickTruck(truckId: string) {
      const truck = this.fleet.find(t => t.id === truckId)
      if (!truck) return
      truck.status = 'Idle'
      truck.driver_id = null
      const driver = this.drivers.find(d => d.assigned_truck_id === truckId)
      if (driver) {
        driver.status = 'Available'
        driver.assigned_truck_id = null
      }
      // Cancel the fleet route so it doesn't block debrief
      const dayStore = useDayStore()
      const route = dayStore.fleet_routes[truckId]
      if (route && route.route_phase === 'in_progress') {
        route.route_phase = 'complete'
      }
    },

    // Refresh the hire marketplace for a new day. Call from handleStartNewDay in app.vue.
    generateDriverPool(dayNumber: number) {
      const offset = dayNumber % DRIVER_POOL_SEED.length
      const hiredNames = new Set(this.drivers.map(d => d.name))
      const rotated = [...DRIVER_POOL_SEED.slice(offset), ...DRIVER_POOL_SEED.slice(0, offset)]
      this.driver_pool = rotated
        .filter(c => !hiredNames.has(c.name))
        .slice(0, 5)
        .map((c, i) => ({ ...c, id: `hire-${dayNumber}-${i}`, available_from_day: dayNumber }))
    },

    hireDriver(hireableId: string): boolean {
      const hireable = this.driver_pool.find(d => d.id === hireableId)
      if (!hireable) return false
      const newDriver: Driver = {
        id: `driver-${Math.random().toString(36).slice(2, 8)}`,
        name: hireable.name,
        wage_per_hr: 0,
        daily_wage: hireable.daily_wage,
        license_class: LICENSE_TO_CLASS[hireable.class_license] ?? 'CLASS_C',
        is_owner_op: false,
        status: 'Available',
        assigned_truck_id: null,
        hos_drive_remaining: 11,
        hos_onduty_remaining: 14,
        hos_reset_remaining: 0,
      }
      this.drivers.push(newDriver)
      this.driver_pool = this.driver_pool.filter(d => d.id !== hireableId)
      return true
    },

    // Deduct guaranteed daily pay for hired drivers who had NO route today.
    // Active drivers already pay wages per-tick (wage_per_hr × hours_worked);
    // charging daily_wage on top would double-bill them.
    // Pass the set of driver IDs that ran routes so idle ones get their standby rate.
    settleDriverPayroll(activeDriverIds: Set<string> = new Set()): number {
      const gameStore = useGameStore()
      let total = 0
      for (const driver of this.drivers) {
        if (driver.is_owner_op || !driver.daily_wage) continue
        if (activeDriverIds.has(driver.id)) continue  // already paid per-tick
        total += driver.daily_wage
      }
      if (total > 0) gameStore.deductCash(total, 'wages')
      return total
    },

    addTruck(truck: Truck) {
      this.fleet.push(truck)
    },

    addDriver(driver: Driver) {
      this.drivers.push(driver)
    },

    ensureDefaultDriver() {
      if (this.drivers.length === 0) {
        this.drivers.push({
          id: 'driver-you',
          name: 'You (Owner-Op)',
          wage_per_hr: 0,
          daily_wage: 0,
          license_class: 'CLASS_A',
          is_owner_op: true,
          status: 'Available',
          assigned_truck_id: null,
          hos_drive_remaining: 11,
          hos_onduty_remaining: 14,
          hos_reset_remaining: 0,
        })
      }
      // Backfill license_class for pre-existing drivers that predate the schema upgrade
      for (const d of this.drivers) {
        if (!d.license_class) d.license_class = d.is_owner_op ? 'CLASS_A' : 'CLASS_C'
        if (d.daily_wage === undefined) d.daily_wage = 0
      }
      // Backfill required_license + resale_value for pre-existing trucks
      for (const t of this.fleet) {
        if (t.type !== 'truck') continue
        if (!(t as Truck).required_license) (t as Truck).required_license = 'CLASS_C'
        if (!(t as Truck).resale_value) (t as Truck).resale_value = 0
      }
    },
  },
})
