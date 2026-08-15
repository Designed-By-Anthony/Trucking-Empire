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
  if (!dayStore.truck_id || !dayStore.driver_id) return

  const truck = fleetStore.getTruckById(dayStore.truck_id)
  const driver = fleetStore.getDriverById(dayStore.driver_id)
  if (!truck || !driver) return

  const currentTick = gameStore.company.date_tick
  const stop = dayStore.manifest[dayStore.current_stop_index]

  // Determine driving vs at-stop based on whether ETA has been reached
  const isDriving = !!(stop && currentTick < stop.eta_game_hour)

  if (isDriving) {
    // Fuel and odometer drain only while driving between stops
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

    // Drive HOS only drains while wheels are rolling
    const newHosDrive = Math.max(0, driver.hos_drive_remaining - hoursElapsed)
    fleetStore.updateDriverHOS(driver.id, { hos_drive_remaining: newHosDrive })
  }

  // On-duty window drains continuously throughout the shift (driving + service)
  const newHosOnduty = Math.max(0, driver.hos_onduty_remaining - hoursElapsed)
  fleetStore.updateDriverHOS(driver.id, { hos_onduty_remaining: newHosOnduty })

  // Wages (free owner-op driver has wage_per_hr = 0, no cost)
  if (driver.wage_per_hr > 0) {
    gameStore.deductCash(driver.wage_per_hr * hoursElapsed, 'wages', truck.id)
  }

  // Mirror driving/stopped state into truck status so FleetPanel badge stays live
  const targetStatus = isDriving ? 'EN_ROUTE' : (stop ? 'LOADING' : 'Idle')
  if (truck.status !== targetStatus) {
    fleetStore.setTruckPhase0Status(truck.id, targetStatus as 'EN_ROUTE' | 'LOADING' | 'Idle')
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

  const tick = () => {
    const gameStore = useGameStore()
    const fleetStore = useFleetStore()
    const contractStore = useContractStore()
    const dayStore = useDayStore()

    if (gameStore.clock_speed === 0) return

    // Hard lock: clock does not advance while the player is in the morning board.
    // The day only moves forward once a route starts or the debrief fires.
    if (dayStore.phase === 'planning') return

    // 1× = 1 game hour per real minute (120 ticks/min × speed/120 = speed hrs/min)
    const hoursElapsed = gameStore.clock_speed / 120

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

  const start = () => {
    if (intervalId) return
    intervalId = setInterval(tick, 500)
  }

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { start, stop, tick }
}
