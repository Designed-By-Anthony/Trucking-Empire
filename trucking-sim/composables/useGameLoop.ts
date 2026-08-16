import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useContractStore } from '~/stores/useContractStore'
import { useTerminalStore } from '~/stores/useTerminalStore'
import { useDayStore } from '~/stores/useDayStore'
import {
  FUEL_PRICE,
  MAINTENANCE_OIL_MILES,
  MAINTENANCE_MAJOR_MILES,
  CONDITION_DECAY_PER_1000MI,
  HOS_MAX_DRIVE,
  HOS_MAX_ONDUTY,
} from '~/data/terminals'

// ─── Truck tick handler ────────────────────────────────────────────────────
// Registered for 'truck' transport type. Future types register their own.

function processTruckTick(truckId: string, hoursElapsed: number) {
  const fleetStore = useFleetStore()
  const gameStore = useGameStore()
  const contractStore = useContractStore()

  const truck = fleetStore.getTruckById(truckId)
  if (!truck || truck.status !== 'In Transit') return

  const driver = fleetStore.getDriverForTruck(truckId)
  if (!driver) return

  // ── Handle active weather/traffic delay ──
  if (truck.delay_hours_remaining > 0) {
    const delayBurned = Math.min(hoursElapsed, truck.delay_hours_remaining)
    fleetStore.updateTruckProgress(truckId, { delay_hours_remaining: truck.delay_hours_remaining - delayBurned })
    // Wages still tick during delay
    const wageCost = driver.wage_per_hr * hoursElapsed
    gameStore.deductCash(wageCost, 'wages', truckId)
    return
  }

  // ── HOS check — driver out of hours ──
  if (driver.hos_drive_remaining <= 0 || driver.hos_onduty_remaining <= 0) {
    fleetStore.forceDriverOffDuty(driver.id)
    return
  }

  // ── Calculate progress this tick ──
  // Average truck speed 55mph, slowed by payload and condition
  const baseSpeedMph = 55
  const conditionFactor = 0.7 + (truck.condition / 100) * 0.3
  const speedMph = baseSpeedMph * conditionFactor

  const rawMiles = speedMph * hoursElapsed
  const remainingMiles = truck.route_distance_miles * (1 - truck.progress)
  const milesThisTick = Math.min(rawMiles, Math.max(0, remainingMiles))
  const progressDelta = truck.route_distance_miles > 0 ? rawMiles / truck.route_distance_miles : 1
  const newProgress = Math.min(1, truck.progress + progressDelta)

  // ── Fuel burn — based on actual miles driven, not raw speed ──
  const fuelBurned = milesThisTick / truck.mpg
  const fuelCost = fuelBurned * FUEL_PRICE
  const newFuelLevel = Math.max(0, truck.fuel_level - fuelBurned)

  // ── Odometer + condition ──
  const newOdometer = truck.odometer + milesThisTick
  const conditionDecay = (milesThisTick / 1000) * CONDITION_DECAY_PER_1000MI
  const newCondition = Math.max(0, truck.condition - conditionDecay)

  // ── Maintenance triggers ──
  const crossedOil = Math.floor(truck.odometer / MAINTENANCE_OIL_MILES) < Math.floor(newOdometer / MAINTENANCE_OIL_MILES)
  const crossedMajor = Math.floor(truck.odometer / MAINTENANCE_MAJOR_MILES) < Math.floor(newOdometer / MAINTENANCE_MAJOR_MILES)
  const maintenanceDue = crossedOil || crossedMajor

  // ── HOS deduction ──
  const newHosDrive = Math.max(0, driver.hos_drive_remaining - hoursElapsed)
  const newHosOnduty = Math.max(0, driver.hos_onduty_remaining - hoursElapsed)

  // ── Wages ──
  const wageCost = driver.wage_per_hr * hoursElapsed

  // ── Weather event — 20% chance per 4-hr block ──
  let weatherDelay = 0
  const fourHrBlocks = Math.floor(hoursElapsed / 4)
  for (let i = 0; i < fourHrBlocks; i++) {
    if (Math.random() < 0.20) {
      weatherDelay += Math.floor(Math.random() * 3) + 1  // 1–3 hours
    }
  }

  // ── Apply all updates ──
  gameStore.deductCash(fuelCost, 'fuel', truckId)
  gameStore.deductCash(wageCost, 'wages', truckId)

  fleetStore.updateTruckProgress(truckId, {
    progress: newProgress,
    fuel_level: newFuelLevel,
    odometer: newOdometer,
    condition: newCondition,
    maintenance_due: maintenanceDue,
    delay_hours_remaining: weatherDelay,
  })

  fleetStore.updateDriverHOS(driver.id, {
    hos_drive_remaining: newHosDrive,
    hos_onduty_remaining: newHosOnduty,
  })

  // ── Delivery resolution ──
  if (newProgress >= 1) {
    const contract = contractStore.getByTruckId(truckId)
    if (contract) {
      gameStore.addCash(contract.payout, contract.id)
      contractStore.resolveDelivery(contract.id)
      const onTime = gameStore.company.date_tick <= contract.delivery_deadline
      gameStore.adjustReputation(onTime ? 2 : -5)
    }
    fleetStore.returnTruckToIdle(truckId)

    // Charge maintenance costs if overdue
    if (maintenanceDue || crossedMajor) {
      const repairCost = crossedMajor ? 2500 : 350
      gameStore.deductCash(repairCost, 'maintenance', truckId)
    }
  }

  // ── Force off duty if HOS exhausted mid-route ──
  if ((newHosDrive <= 0 || newHosOnduty <= 0) && newProgress < 1) {
    fleetStore.forceDriverOffDuty(driver.id)
  }
}

// ─── Phase-0 P&D tick ─────────────────────────────────────────────────────
// Drains fuel, odometer, condition, and HOS for the active local delivery route.
// The contract system (processTruckTick) only runs for Phase-1 hub-to-hub trucks;
// Phase-0 routes live in useDayStore and need their own resource drain logic.

const AVG_SPEED_MPH_P0 = 22  // matches useRoutePlanner constant

function processPhase0Tick(hoursElapsed: number) {
  const dayStore = useDayStore()
  const fleetStore = useFleetStore()
  const gameStore = useGameStore()

  if (dayStore.phase !== 'in_progress') return

  const currentTick = gameStore.company.date_tick

  for (const [truckId, route] of Object.entries(dayStore.fleet_routes)) {
    if (route.route_phase !== 'in_progress') continue

    const truck = fleetStore.getTruckById(truckId)
    const driver = route.driver_id ? fleetStore.getDriverById(route.driver_id) : null
    if (!truck || !driver) continue

    const stop = route.manifest[route.current_stop_index]
    const isDriving = !!(stop && currentTick < stop.eta_game_hour)

    if (isDriving) {
      const milesThisTick = AVG_SPEED_MPH_P0 * hoursElapsed
      const fuelBurned = milesThisTick / truck.mpg
      const newFuelLevel = Math.max(0, truck.fuel_level - fuelBurned)
      const newOdometer = truck.odometer + milesThisTick
      const conditionDecay = (milesThisTick / 1000) * CONDITION_DECAY_PER_1000MI
      const newCondition = Math.max(0, truck.condition - conditionDecay)

      gameStore.deductCash(fuelBurned * FUEL_PRICE, 'fuel', truck.id)
      fleetStore.updateTruckProgress(truck.id, {
        fuel_level: newFuelLevel,
        odometer: newOdometer,
        condition: newCondition,
      })

      // ── Fuel-out enforcement: settle the route early ──────────────────────
      if (truck.fuel_level > 0 && newFuelLevel === 0) {
        dayStore.completeRoute(truckId)
        continue
      }

      const newHosDrive = Math.max(0, driver.hos_drive_remaining - hoursElapsed)
      fleetStore.updateDriverHOS(driver.id, { hos_drive_remaining: newHosDrive })

      // ── HOS drive-hours exhausted mid-route ───────────────────────────────
      if (newHosDrive <= 0) {
        fleetStore.forceDriverOffDuty(driver.id)
        dayStore.completeRoute(truckId)
        continue
      }
    }

    const newHosOnduty = Math.max(0, driver.hos_onduty_remaining - hoursElapsed)
    fleetStore.updateDriverHOS(driver.id, { hos_onduty_remaining: newHosOnduty })

    // ── HOS on-duty hours exhausted ───────────────────────────────────────
    if (newHosOnduty <= 0) {
      fleetStore.forceDriverOffDuty(driver.id)
      dayStore.completeRoute(truckId)
      continue
    }

    if (driver.wage_per_hr > 0) {
      gameStore.deductCash(driver.wage_per_hr * hoursElapsed, 'wages', truck.id)
    }

    const targetStatus = isDriving ? 'EN_ROUTE' : (stop ? 'LOADING' : 'Idle')
    if (truck.status !== targetStatus) {
      fleetStore.setTruckPhase0Status(truck.id, targetStatus as 'EN_ROUTE' | 'LOADING' | 'Idle')
    }
  }
}

// ─── HOS reset tick ────────────────────────────────────────────────────────

function processHOSResets(hoursElapsed: number) {
  const fleetStore = useFleetStore()

  fleetStore.drivers.forEach(driver => {
    if (driver.status === 'Off Duty' && driver.hos_reset_remaining > 0) {
      const newReset = Math.max(0, driver.hos_reset_remaining - hoursElapsed)
      fleetStore.updateDriverHOS(driver.id, { hos_reset_remaining: newReset })
      if (newReset === 0) fleetStore.completeHOSReset(driver.id)
    }
  })
}

// ─── Overhead deduction ────────────────────────────────────────────────────

function processOverhead(hoursElapsed: number) {
  const gameStore = useGameStore()
  const terminalStore = useTerminalStore()
  const cost = terminalStore.totalOverheadPerHr * hoursElapsed
  if (cost > 0) gameStore.deductCash(cost, 'overhead')
}

// ─── Main game loop composable ─────────────────────────────────────────────

export const useGameLoop = () => {
  let intervalId: ReturnType<typeof setInterval> | null = null
  let lastTickReal = Date.now()

  const tick = (catchupMs?: number) => {
    const gameStore = useGameStore()
    const fleetStore = useFleetStore()
    const contractStore = useContractStore()
    const dayStore = useDayStore()

    if (gameStore.clock_speed === 0) return

    // Hard lock: clock does not advance while the player is in the morning board.
    if (dayStore.phase === 'planning') return

    // Use actual wall-clock elapsed so the sim stays accurate even when the
    // browser throttles setInterval (background tabs, low-power mode, etc.).
    // Clamp to 5 minutes max to prevent runaway catch-up after long absences.
    const now = Date.now()
    const actualMs = catchupMs ?? Math.min(now - lastTickReal, 5 * 60 * 1000)
    lastTickReal = now

    // 1× = 1 game hour per real minute
    const hoursElapsed = (actualMs / 60000) * gameStore.clock_speed
    if (hoursElapsed <= 0) return

    // 1. Advance time
    gameStore.advanceTick(hoursElapsed)

    // 2a. Phase-1 contract trucks (hub-to-hub hauls)
    fleetStore.activeTrucks.forEach(truck => processTruckTick(truck.id, hoursElapsed))

    // 2b. Phase-0 local P&D route — drains fuel/HOS for active delivery day
    processPhase0Tick(hoursElapsed)

    // 3. HOS resets for off-duty drivers
    processHOSResets(hoursElapsed)

    // 4. Overhead costs
    processOverhead(hoursElapsed)

    // 5. Day advancement — new day every 24 game hours
    const newDay = Math.floor(gameStore.company.date_tick / 24)
    if (newDay > gameStore.company.current_day) {
      gameStore.advanceDay()
      contractStore.pruneOldContracts()
    }

    // 6. Contract expiry
    contractStore.failExpiredContracts(gameStore.company.date_tick)

    // 7. Refill contract pool (zone-based, phase-aware)
    contractStore.generateContracts(gameStore.company.date_tick, gameStore.company.phase)
  }

  // Visibility catch-up: when the tab comes back into focus after being hidden,
  // apply one tick with the full elapsed duration so no game time is lost.
  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      const elapsed = Math.min(Date.now() - lastTickReal, 5 * 60 * 1000)
      if (elapsed > 1000) tick(elapsed)
    }
  }

  const start = () => {
    if (intervalId) return
    lastTickReal = Date.now()
    intervalId = setInterval(tick, 500)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return { start, stop, tick }
}
