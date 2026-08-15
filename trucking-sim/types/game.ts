// ─── Transport modes & types ───────────────────────────────────────────────
// Designed for extensibility: Phase 1 uses 'ground'/'truck', future phases
// inject 'air', 'sea', 'rail' without touching existing logic.

export type TransportMode = 'ground' | 'air' | 'sea' | 'intermodal'
export type TransportType = 'truck' | 'aircraft' | 'vessel' | 'rail'
// Phase-1 contract haul states (legacy, keep for hub-to-hub contract system)
// Phase-0 P&D loop states: EN_ROUTE (driving to stop), LOADING (at stop service)
export type TransportStatus =
  | 'Idle'
  | 'In Transit'
  | 'Out of Service'
  | 'Fueling'
  | 'Loading'
  | 'EN_ROUTE'
  | 'LOADING'
  | 'LINE_HAUL'

export type HubType = 'terminal' | 'airport' | 'seaport' | 'railyard'
export type TruckType = 'Box Truck' | 'Day Cab' | 'Semi' | 'Flatbed' | 'Reefer'
export type DriverStatus = 'Available' | 'Driving' | 'Off Duty' | 'Sleeper'
export type ContractStatus = 'Available' | 'Assigned' | 'In Transit' | 'Delivered' | 'Failed'

// ─── Base interfaces (extend, never replace) ───────────────────────────────

export interface Hub {
  id: string
  type: HubType
  name: string
  city: string
  state: string
  lat: number
  lng: number
}

export interface Transport {
  id: string
  type: TransportType
  mode: TransportMode
  status: TransportStatus
  progress: number          // 0.0 → 1.0 along current route
  payload_lbs: number
  origin_hub_id: string
  target_hub_id: string | null
  route_geometry: [number, number][] | null  // [lng, lat] points from OSRM
  route_distance_miles: number
}

// ─── Phase 1 concrete types ────────────────────────────────────────────────

export interface Terminal extends Hub {
  type: 'terminal'
  doors: number
  overhead_per_hr: number   // fixed cost per game hour
  unlocked: boolean
}

export interface Truck extends Transport {
  type: 'truck'
  mode: 'ground'
  truck_type: TruckType
  name: string
  max_weight_lbs: number
  mpg: number
  fuel_level: number        // gallons remaining
  fuel_capacity: number     // max gallons
  odometer: number          // total miles driven
  condition: number         // 0–100, degrades with use
  driver_id: string | null
  delay_hours_remaining: number  // weather/traffic delay
  maintenance_due: boolean
}

export interface Driver {
  id: string
  name: string
  wage_per_hr: number
  status: DriverStatus
  assigned_truck_id: string | null
  hos_drive_remaining: number    // hours of driving left (max 11)
  hos_onduty_remaining: number   // total on-duty window left (max 14)
  hos_reset_remaining: number    // hours until 10hr reset completes
}

export interface Contract {
  id: string
  origin_hub_id: string
  destination_hub_id: string
  transport_mode: TransportMode  // future-proofed
  weight_lbs: number
  payout: number
  pickup_deadline: number        // game hour tick
  delivery_deadline: number      // game hour tick
  status: ContractStatus
  assigned_truck_id: string | null
  distance_miles: number
}

export interface Company {
  name: string
  cash: number
  date_tick: number              // game hours elapsed since start
  current_day: number            // day number (0-indexed), used for job generation
  phase: number                  // 0=local van, 1=box truck, 2=day cab, 3=semi
  reputation: number             // 0–100
  total_revenue: number
  total_expenses: number
}

export interface ExpenseEntry {
  tick: number
  category: 'fuel' | 'wages' | 'maintenance' | 'overhead' | 'vehicle'
  amount: number
  truck_id?: string
}

export interface RevenueEntry {
  tick: number
  contract_id: string
  amount: number
}

// ─── Routing abstraction (extensible provider pattern) ────────────────────

export interface RouteResult {
  geometry: [number, number][]   // [lng, lat] polyline points
  distance_miles: number
  duration_hours: number
}

export type RouteProvider = (
  originLat: number, originLng: number,
  destLat: number, destLng: number
) => Promise<RouteResult>

// ─── Game loop tick handler (register per transport type) ─────────────────

export type TickHandler = (transport: Transport, hours: number) => Partial<Transport>

// ─── Clock speeds ──────────────────────────────────────────────────────────

export type ClockSpeed = 0 | 1 | 2 | 4   // 0 = paused

// ─── Phase 0 Local P&D types ───────────────────────────────────────────────

export type DeliveryType = 'residential' | 'commercial' | 'dock'
export type EquipmentTag = 'liftgate' | 'dock_high' | 'residential_only'
export type DayPhase = 'planning' | 'in_progress' | 'debrief'

// 'delivery' = terminal → customer (inbound line-haul freight on the dock)
// 'pickup'   = customer → terminal (outbound freight the driver collects)
export type JobType = 'delivery' | 'pickup'

export interface Job {
  id: string
  job_type?: JobType          // defaults to 'delivery' when absent (backwards compat)
  freight_dest?: FreightDest  // outbound destination assigned at pickup generation time
  customer_name: string
  pickup_address: string
  delivery_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_lat: number
  delivery_lng: number
  weight_lbs: number
  volume_ft3: number
  payout: number
  window_open: number     // game hour 0-23
  window_close: number    // game hour 0-23
  delivery_type: DeliveryType
  equipment_tags: EquipmentTag[]
  status: 'pending' | 'on_manifest' | 'picked_up' | 'delivered' | 'failed' | 'declined'
  is_emergency?: boolean
  notes?: string
}

// ─── Terminal Dock Freight ─────────────────────────────────────────────────
// Persistent freight sitting on the terminal dock between days.

export type DockFreightSource = 'initial_seed' | 'line_haul_arrival' | 'driver_pickup'
export type DockFreightStatus = 'available' | 'on_manifest' | 'delivered' | 'outbound_staged' | 'departed'

export interface DockFreight {
  id: string
  job: Job
  terminal_id: string
  status: DockFreightStatus
  source: DockFreightSource
  day_arrived: number
}

// ─── Freight Destination & Outbound Staging ────────────────────────────────
// Where a pickup job's freight is ultimately headed after leaving the terminal.

export type FreightDestType = 'intra_regional' | 'in_network' | 'out_of_network'
export type CarrierMode = 'player_owned' | 'rented' | 'brokered'
export type OutboundStatus = 'dock_pending' | 'carrier_assigned' | 'brokered' | 'departed'

export interface FreightDest {
  type: FreightDestType
  terminal_id: string | null  // null for out-of-network destinations
  label: string               // human-readable: "Syracuse Terminal", "Philadelphia, PA"
  distance_miles: number
}

// Spot-market line-haul carrier option for a specific lane
export interface LineHaulOption {
  id: string
  carrier: string             // fictional carrier name
  dest: FreightDest
  rate_per_lb: number
  rate_per_ft3: number
  flat_min: number            // minimum charge regardless of weight/volume
  max_weight_lbs: number
  max_volume_ft3: number
  departs_day: number         // game day it departs
  arrives_day: number
}

// Outbound freight on the terminal dock awaiting carrier assignment
export interface StagedOutbound {
  id: string
  job: Job
  terminal_id: string
  dest: FreightDest
  day_staged: number
  status: OutboundStatus
  carrier_mode: CarrierMode | null
  line_haul_id: string | null
  carrier_cost: number        // cost charged at time of carrier assignment
  broker_fee: number          // fee deducted when brokered
  demurrage_paid: number      // running total of demurrage fees
}

export interface ManifestStop {
  job: Job
  sequence: number
  eta_game_hour: number
  on_time: boolean | null
}

export interface DayResult {
  day: number
  date_tick_start: number
  jobs_attempted: number
  jobs_delivered: number
  jobs_failed: number
  jobs_declined: number
  revenue: number
  late_penalties: number
  density_score: number
  stem_time_hours: number
  in_zone_hours: number
}

export interface DispatchEvent {
  id: string
  type: 'pickup_call' | 'customer_unavailable' | 'address_correction'
  job: Job
  fires_at_tick: number
  message: string
  accepted: boolean | null
  expires_at_tick: number
}
