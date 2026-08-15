import { defineStore } from 'pinia'
import type { Truck, Driver } from '~/types/game'
import { INITIAL_TRUCKS, INITIAL_DRIVERS } from '~/data/terminals'
import type { VehicleListing } from '~/data/vehicles'
import { useGameStore } from '~/stores/useGameStore'

export const useFleetStore = defineStore('fleet', {
  state: () => ({
    fleet: [...INITIAL_TRUCKS] as Truck[],
    drivers: [...INITIAL_DRIVERS] as Driver[],
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
      }

      gameStore.deductCash(listing.price, 'vehicle', id)
      this.fleet.push(truck)

      // First purchase: add "You (Owner)" as a free driver
      if (this.drivers.length === 0) {
        this.drivers.push({
          id: 'driver-you',
          name: 'You (Owner-Op)',
          wage_per_hr: 0,
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

      if (driver) driver.status = 'Available'
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
          name: 'You',
          wage_per_hr: 0,
          status: 'Available',
          assigned_truck_id: null,
          hos_drive_remaining: 11,
          hos_onduty_remaining: 14,
          hos_reset_remaining: 0,
        })
      }
    },
  },
})
