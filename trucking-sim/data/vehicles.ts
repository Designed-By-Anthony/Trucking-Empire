import type { TruckType } from '~/types/game'

export interface VehicleListing {
  id: string
  truck_type: TruckType
  name: string
  tagline: string
  price: number
  speed_mph: number
  mpg: number
  fuel_capacity: number
  max_weight_lbs: number
  volume_ft3: number         // cargo cube capacity
  has_liftgate: boolean      // equipped for curbside lift delivery
  has_dock_access: boolean   // dock-height compatible (box trucks and up)
  unlock_at_cash: number
  phase: number
}

export const VEHICLE_CATALOG: VehicleListing[] = [
  {
    id: 'cat-cargo-van',
    truck_type: 'Box Truck',
    name: 'Used Cargo Van',
    tagline: 'Local package deliveries. Gets you off the ground.',
    price: 3500,
    speed_mph: 40,
    mpg: 18,
    fuel_capacity: 25,
    max_weight_lbs: 3500,
    volume_ft3: 280,
    has_liftgate: false,
    has_dock_access: false,
    unlock_at_cash: 0,
    phase: 0,
  },
  {
    id: 'cat-transit-van',
    truck_type: 'Box Truck',
    name: '2022 Transit Van',
    tagline: 'More capacity. Tighter routes, bigger days.',
    price: 12000,
    speed_mph: 45,
    mpg: 15,
    fuel_capacity: 30,
    max_weight_lbs: 5000,
    volume_ft3: 320,
    has_liftgate: false,
    has_dock_access: false,
    unlock_at_cash: 8000,
    phase: 0,
  },
  {
    id: 'cat-box-16',
    truck_type: 'Box Truck',
    name: '16ft Box Truck',
    tagline: 'Dock access, liftgate, Rome and Herkimer in range.',
    price: 22000,
    speed_mph: 55,
    mpg: 12,
    fuel_capacity: 60,
    max_weight_lbs: 14000,
    volume_ft3: 900,
    has_liftgate: true,
    has_dock_access: true,
    unlock_at_cash: 15000,
    phase: 1,
  },
  {
    id: 'cat-box-26',
    truck_type: 'Box Truck',
    name: '26ft Box Truck',
    tagline: 'Heavy freight, wider territory.',
    price: 38000,
    speed_mph: 55,
    mpg: 10,
    fuel_capacity: 80,
    max_weight_lbs: 26000,
    volume_ft3: 1800,
    has_liftgate: true,
    has_dock_access: true,
    unlock_at_cash: 30000,
    phase: 1,
  },
  {
    id: 'cat-daycab',
    truck_type: 'Day Cab',
    name: 'Day Cab Semi',
    tagline: "Albany, Syracuse, Binghamton. You're in freight.",
    price: 85000,
    speed_mph: 65,
    mpg: 7,
    fuel_capacity: 150,
    max_weight_lbs: 44000,
    volume_ft3: 2400,
    has_liftgate: true,
    has_dock_access: true,
    unlock_at_cash: 60000,
    phase: 2,
  },
  {
    id: 'cat-semi',
    truck_type: 'Semi',
    name: 'Full Semi (Sleeper)',
    tagline: 'NYC, Buffalo, the whole Northeast is yours.',
    price: 160000,
    speed_mph: 65,
    mpg: 6,
    fuel_capacity: 200,
    max_weight_lbs: 80000,
    volume_ft3: 2800,
    has_liftgate: true,
    has_dock_access: true,
    unlock_at_cash: 130000,
    phase: 3,
  },
]
