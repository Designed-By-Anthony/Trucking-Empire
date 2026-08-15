import { defineStore } from 'pinia'
import type { Contract, ContractStatus } from '~/types/game'
import { ZONES_BY_PHASE } from '~/data/zones'

// Timestamp-based IDs avoid collisions when state is restored from localStorage
// and the module-level counter would otherwise reset to 1.
function generateId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function haversineApprox(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcPayout(distanceMiles: number, weightLbs: number, phase: number): number {
  if (phase === 0) {
    // Local courier rate: ~$10-15/mile, $20 minimum
    return Math.round(Math.max(20, distanceMiles * 12 + randomBetween(-8, 20)))
  }
  if (phase === 1) {
    // Regional: ~$2.50/mile + weight bonus
    const base = distanceMiles * 2.5
    const weightBonus = (weightLbs / 1000) * 10
    return Math.round(base + weightBonus + randomBetween(-30, 80))
  }
  // Phase 2+: full freight rates
  const base = distanceMiles * 3.5
  const weightBonus = (weightLbs / 1000) * 15
  return Math.round(base + weightBonus + randomBetween(-50, 150))
}

function weightForPhase(phase: number): number {
  if (phase === 0) return randomBetween(20, 400)      // packages, small boxes
  if (phase === 1) return randomBetween(500, 8000)    // pallets, light freight
  return randomBetween(2000, 44000)                    // full freight
}

export const useContractStore = defineStore('contracts', {
  state: () => ({
    contracts: [] as Contract[],
    target_pool_size: 10,
    last_day_generated: -1,  // track which day we last generated a daily batch
  }),

  getters: {
    available(): Contract[] {
      return this.contracts.filter(c => c.status === 'Available')
    },
    active(): Contract[] {
      return this.contracts.filter(c => c.status === 'In Transit' || c.status === 'Assigned')
    },
    delivered(): Contract[] {
      return this.contracts.filter(c => c.status === 'Delivered')
    },
    failed(): Contract[] {
      return this.contracts.filter(c => c.status === 'Failed')
    },
    getById(): (id: string) => Contract | undefined {
      return (id: string) => this.contracts.find(c => c.id === id)
    },
    getByTruckId(): (truckId: string) => Contract | undefined {
      return (truckId: string) => this.contracts.find(c => c.assigned_truck_id === truckId && (c.status === 'In Transit' || c.status === 'Assigned'))
    },
  },

  actions: {
    // Called once per game loop tick — refills available pool if low
    generateContracts(currentTick: number, phase: number) {
      const currentDay = Math.floor(currentTick / 24)

      // Generate a new daily batch at the start of each new day
      if (currentDay > this.last_day_generated) {
        this.last_day_generated = currentDay
        this._generateDayBatch(currentTick, phase, this.target_pool_size)
        return
      }

      // Otherwise top up to target if pool drained
      const needed = Math.ceil(this.target_pool_size / 2) - this.available.length
      if (needed > 0) {
        this._generateDayBatch(currentTick, phase, needed)
      }
    },

    _generateDayBatch(currentTick: number, phase: number, count: number) {
      const zones = ZONES_BY_PHASE[phase] ?? ZONES_BY_PHASE[0]
      if (zones.length < 2) return

      for (let i = 0; i < count; i++) {
        const shuffled = [...zones].sort(() => Math.random() - 0.5)
        const origin = shuffled[0]
        const dest = shuffled.find(t => t.id !== origin?.id)
        if (!origin || !dest) continue

        const distance = haversineApprox(origin.lat, origin.lng, dest.lat, dest.lng)
        const weight = weightForPhase(phase)
        const payout = calcPayout(distance, weight, phase)
        // Pickup window: 6-18 game hours (12-36 real min at 1×). Delivery scaled to distance.
        const pickupHours = randomBetween(6, 18)
        const deliveryHours = pickupHours + Math.max(4, Math.round(distance / 20) + randomBetween(2, 6))

        this.contracts.push({
          id: generateId(),
          origin_hub_id: origin.id,
          destination_hub_id: dest.id,
          transport_mode: 'ground',
          weight_lbs: weight,
          payout,
          pickup_deadline: currentTick + pickupHours,
          delivery_deadline: currentTick + deliveryHours,
          status: 'Available',
          assigned_truck_id: null,
          distance_miles: Math.max(1, Math.round(distance)),
        })
      }
    },

    assignContract(contractId: string, truckId: string) {
      const contract = this.contracts.find(c => c.id === contractId)
      if (!contract) return
      contract.status = 'Assigned'
      contract.assigned_truck_id = truckId
    },

    markInTransit(contractId: string) {
      const contract = this.contracts.find(c => c.id === contractId)
      if (contract) contract.status = 'In Transit'
    },

    resolveDelivery(contractId: string) {
      const contract = this.contracts.find(c => c.id === contractId)
      if (contract) {
        contract.status = 'Delivered'
        contract.assigned_truck_id = null
      }
    },

    failExpiredContracts(currentTick: number) {
      this.contracts.forEach(c => {
        if (c.status === 'Available' && currentTick > c.pickup_deadline) {
          c.status = 'Failed'
        }
        if ((c.status === 'In Transit' || c.status === 'Assigned') && currentTick > c.delivery_deadline) {
          c.status = 'Failed'
          c.assigned_truck_id = null
        }
      })
    },

    // Prune very old delivered/failed contracts to keep store lean
    pruneOldContracts() {
      const keep = this.contracts.filter(
        c => c.status === 'Available' || c.status === 'Assigned' || c.status === 'In Transit'
      )
      const historical = this.contracts
        .filter(c => c.status === 'Delivered' || c.status === 'Failed')
        .slice(-100)  // keep last 100 historical
      this.contracts = [...keep, ...historical]
    },
  },
})
