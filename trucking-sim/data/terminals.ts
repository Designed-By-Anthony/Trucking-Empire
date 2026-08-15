import type { Terminal, Truck, Driver } from '~/types/game'

// These are map reference points only — player doesn't own them at Phase 0.
// overhead_per_hr = 0 until a terminal is purchased as an owned facility.
export const INITIAL_TERMINALS: Terminal[] = [
  {
    id: 'utica',
    type: 'terminal',
    name: 'Utica Cross-Dock',
    city: 'Utica',
    state: 'NY',
    lat: 43.1009,
    lng: -75.2327,
    doors: 0,
    overhead_per_hr: 0,
    unlocked: true,
  },
  {
    id: 'rome',
    type: 'terminal',
    name: 'Rome',
    city: 'Rome',
    state: 'NY',
    lat: 43.2128,
    lng: -75.4557,
    doors: 0,
    overhead_per_hr: 0,
    unlocked: false,
  },
  {
    id: 'herkimer',
    type: 'terminal',
    name: 'Herkimer',
    city: 'Herkimer',
    state: 'NY',
    lat: 43.0248,
    lng: -74.9882,
    doors: 0,
    overhead_per_hr: 0,
    unlocked: false,
  },
]

// No starting fleet — player buys their first vehicle from the shop
export const INITIAL_TRUCKS: Truck[] = []

// Phase 0: you are the driver of your own van
export const INITIAL_DRIVERS: Driver[] = [
  {
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
  },
]

// Fuel price per gallon
export const FUEL_PRICE = 4.0

// Maintenance triggers (miles)
export const MAINTENANCE_OIL_MILES = 10000
export const MAINTENANCE_MAJOR_MILES = 50000

// HOS rules (hours)
export const HOS_MAX_DRIVE = 11
export const HOS_MAX_ONDUTY = 14
export const HOS_RESET_HOURS = 10

// Condition degradation per 1000 miles
export const CONDITION_DECAY_PER_1000MI = 2
