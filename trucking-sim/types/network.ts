// ─── NY State Hub-and-Spoke Network Types ─────────────────────────────────

export type NodeTier = 'major_hub' | 'regional_terminal' | 'local_zone'

export type HighwayCorridor = 'I-90' | 'I-87' | 'I-81' | 'I-88' | 'I-86' | 'I-190' | 'I-390' | 'I-84'

export type TrailerStatus = 'loading' | 'staged' | 'in_transit' | 'unloading' | 'empty'

export type LTLRouteType = 'direct_local' | 'single_transfer' | 'multi_hub'

export type SegmentType = 'local_pd' | 'line_haul' | 'trunk'

export type LineHaulTrigger = 'scheduled' | 'cube_out' | 'manual'

export type ManifestStatus = 'building' | 'sealed' | 'in_transit' | 'delivered'

// ─── Network Node ─────────────────────────────────────────────────────────

export interface NetworkNode {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  tier: NodeTier
  /** null for major hubs */
  parent_hub_id: string | null
  /** only set for local zones */
  parent_terminal_id: string | null
  doors: number
  max_doors: number
  purchase_cost: number
  operational_cost_per_day: number
  owned: boolean
  unlocked: boolean
  /** local zones only */
  zip_codes?: string[]
  served_towns?: string[]
}

// ─── Line-Haul Route ──────────────────────────────────────────────────────

export interface LineHaulRoute {
  id: string
  origin_node_id: string
  destination_node_id: string
  distance_miles: number
  transit_hours: number
  highway_corridors: HighwayCorridor[]
  /** game hour 0-23 for nightly departure; null = cube-out or manual only */
  scheduled_departure_hour: number | null
  requires_relay: boolean
  relay_node_id: string | null
}

// ─── Freight Manifest ─────────────────────────────────────────────────────

export interface FreightManifest {
  id: string
  contract_ids: string[]
  origin_node_id: string
  destination_node_id: string
  total_weight_lbs: number
  total_volume_ft3: number
  status: ManifestStatus
  created_tick: number
  sealed_tick: number | null
  delivered_tick: number | null
}

// ─── Active Trailer ───────────────────────────────────────────────────────

export interface ActiveTrailer {
  id: string
  status: TrailerStatus
  location_node_id: string
  destination_node_id: string | null
  manifest_id: string | null
  driver_id: string | null
  truck_id: string | null
  weight_lbs: number
  volume_ft3: number
  max_weight_lbs: number
  max_volume_ft3: number
  departure_tick: number | null
  arrival_tick: number | null
  triggered_by: LineHaulTrigger | null
}

// ─── LTL Route Result ─────────────────────────────────────────────────────

export interface LTLSegment {
  from_node_id: string
  to_node_id: string
  distance_miles: number
  transit_hours: number
  highway_corridors: HighwayCorridor[]
  segment_type: SegmentType
}

export interface LTLRoute {
  route_type: LTLRouteType
  segments: LTLSegment[]
  total_distance_miles: number
  total_transit_hours: number
  requires_relay: boolean
  relay_node_ids: string[]
}

// ─── Fill Status ──────────────────────────────────────────────────────────

export interface TrailerFill {
  weight_pct: number
  volume_pct: number
  /** max of the two — used for cube-out detection */
  utilization: number
}
