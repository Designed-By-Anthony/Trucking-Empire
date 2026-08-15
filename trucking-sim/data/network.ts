import type { NetworkNode, LineHaulRoute } from '~/types/network'

// ─── Network Nodes ─────────────────────────────────────────────────────────

export const NETWORK_NODES: NetworkNode[] = [

  // ── Tier 1: Major Cross-Dock Hubs (Breakbulk / Sortation Centers) ────────

  {
    id: 'hub-albany',
    name: 'Capital District Hub',
    city: 'Albany',
    lat: 42.6526,
    lng: -73.7562,
    tier: 'major_hub',
    parent_hub_id: null,
    parent_terminal_id: null,
    doors: 60,
    max_doors: 100,
    purchase_cost: 0,           // unlocked from day 1 as network anchor
    operational_cost_per_day: 2_400,
    owned: false,
    unlocked: true,
  },
  {
    id: 'hub-syracuse',
    name: 'Central NY Hub',
    city: 'Syracuse',
    lat: 43.0481,
    lng: -76.1474,
    tier: 'major_hub',
    parent_hub_id: null,
    parent_terminal_id: null,
    doors: 75,
    max_doors: 100,
    purchase_cost: 0,
    operational_cost_per_day: 2_800,
    owned: false,
    unlocked: true,
  },
  {
    id: 'hub-buffalo',
    name: 'Western NY Hub',
    city: 'Buffalo',
    lat: 42.8864,
    lng: -78.8784,
    tier: 'major_hub',
    parent_hub_id: null,
    parent_terminal_id: null,
    doors: 80,
    max_doors: 100,
    purchase_cost: 380_000,
    operational_cost_per_day: 3_200,
    owned: false,
    unlocked: false,
  },
  {
    id: 'hub-nyc',
    name: 'Metro Hub',
    city: 'Bronx',
    lat: 40.9176,
    lng: -73.8748,
    tier: 'major_hub',
    parent_hub_id: null,
    parent_terminal_id: null,
    doors: 100,
    max_doors: 100,
    purchase_cost: 750_000,
    operational_cost_per_day: 5_500,
    owned: false,
    unlocked: false,
  },

  // ── Tier 2: Regional Terminals (End-of-Line Hubs) ─────────────────────────

  {
    id: 'term-utica',
    name: 'Utica Terminal',
    city: 'Utica',
    lat: 43.1009,
    lng: -75.2327,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-syracuse',
    parent_terminal_id: null,
    doors: 12,
    max_doors: 25,
    purchase_cost: 0,           // starting terminal — player already owns it
    operational_cost_per_day: 480,
    owned: true,
    unlocked: true,
  },
  {
    id: 'term-binghamton',
    name: 'Binghamton Terminal',
    city: 'Binghamton',
    lat: 42.0987,
    lng: -75.9179,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-albany',
    parent_terminal_id: null,
    doors: 10,
    max_doors: 20,
    purchase_cost: 85_000,
    operational_cost_per_day: 380,
    owned: false,
    unlocked: false,
  },
  {
    id: 'term-rochester',
    name: 'Rochester Terminal',
    city: 'Rochester',
    lat: 43.1566,
    lng: -77.6088,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-buffalo',
    parent_terminal_id: null,
    doors: 18,
    max_doors: 25,
    purchase_cost: 120_000,
    operational_cost_per_day: 520,
    owned: false,
    unlocked: false,
  },
  {
    id: 'term-plattsburgh',
    name: 'Plattsburgh Terminal',
    city: 'Plattsburgh',
    lat: 44.6995,
    lng: -73.4529,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-albany',
    parent_terminal_id: null,
    doors: 8,
    max_doors: 16,
    purchase_cost: 65_000,
    operational_cost_per_day: 280,
    owned: false,
    unlocked: false,
  },
  {
    id: 'term-watertown',
    name: 'Watertown Terminal',
    city: 'Watertown',
    lat: 43.9748,
    lng: -75.9107,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-syracuse',
    parent_terminal_id: null,
    doors: 8,
    max_doors: 16,
    purchase_cost: 60_000,
    operational_cost_per_day: 260,
    owned: false,
    unlocked: false,
  },
  {
    id: 'term-elmira',
    name: 'Elmira Terminal',
    city: 'Elmira',
    lat: 42.0898,
    lng: -76.8077,
    tier: 'regional_terminal',
    parent_hub_id: 'hub-buffalo',
    parent_terminal_id: null,
    doors: 8,
    max_doors: 16,
    purchase_cost: 58_000,
    operational_cost_per_day: 250,
    owned: false,
    unlocked: false,
  },

  // ── Tier 3: Local P&D Zones (Utica Terminal footprint) ────────────────────

  {
    id: 'zone-utica-core',
    name: 'Utica Core',
    city: 'Utica',
    lat: 43.1009,
    lng: -75.2327,
    tier: 'local_zone',
    parent_hub_id: null,
    parent_terminal_id: 'term-utica',
    doors: 0,
    max_doors: 0,
    purchase_cost: 0,
    operational_cost_per_day: 0,
    owned: true,
    unlocked: true,
    zip_codes: ['13501', '13502', '13503', '13504', '13505'],
    served_towns: ['Utica'],
  },
  {
    id: 'zone-rome',
    name: 'Rome',
    city: 'Rome',
    lat: 43.2128,
    lng: -75.4557,
    tier: 'local_zone',
    parent_hub_id: null,
    parent_terminal_id: 'term-utica',
    doors: 0,
    max_doors: 0,
    purchase_cost: 0,
    operational_cost_per_day: 0,
    owned: true,
    unlocked: true,
    zip_codes: ['13440', '13441', '13442'],
    served_towns: ['Rome'],
  },
  {
    id: 'zone-herkimer',
    name: 'Herkimer / Ilion',
    city: 'Herkimer',
    lat: 43.0248,
    lng: -74.9882,
    tier: 'local_zone',
    parent_hub_id: null,
    parent_terminal_id: 'term-utica',
    doors: 0,
    max_doors: 0,
    purchase_cost: 0,
    operational_cost_per_day: 0,
    owned: true,
    unlocked: true,
    zip_codes: ['13350', '13357'],
    served_towns: ['Herkimer', 'Ilion'],
  },
  {
    id: 'zone-marcy-nhart',
    name: 'Marcy / New Hartford',
    city: 'Marcy',
    lat: 43.1637,
    lng: -75.2685,
    tier: 'local_zone',
    parent_hub_id: null,
    parent_terminal_id: 'term-utica',
    doors: 0,
    max_doors: 0,
    purchase_cost: 0,
    operational_cost_per_day: 0,
    owned: true,
    unlocked: true,
    zip_codes: ['13403', '13413'],
    served_towns: ['Marcy', 'New Hartford', 'Whitesboro'],
  },
]

// ─── Line-Haul Routes ──────────────────────────────────────────────────────
// All routes are bi-directional (each direction is its own record).
// Trunk routes connect Major Hub → Major Hub.
// Feeder routes connect Major Hub ↔ Regional Terminal.

export const LINE_HAUL_ROUTES: LineHaulRoute[] = [

  // ── Trunk: I-90 Thruway Backbone ─────────────────────────────────────────

  { id: 'lhr-buf-syr', origin_node_id: 'hub-buffalo',  destination_node_id: 'hub-syracuse', distance_miles: 150, transit_hours: 2.5,  highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-syr-buf', origin_node_id: 'hub-syracuse', destination_node_id: 'hub-buffalo',  distance_miles: 150, transit_hours: 2.5,  highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-syr-alb', origin_node_id: 'hub-syracuse', destination_node_id: 'hub-albany',   distance_miles: 148, transit_hours: 2.5,  highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-alb-syr', origin_node_id: 'hub-albany',   destination_node_id: 'hub-syracuse', distance_miles: 148, transit_hours: 2.5,  highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },

  // ── Trunk: I-87 Northway ──────────────────────────────────────────────────

  { id: 'lhr-alb-nyc', origin_node_id: 'hub-albany', destination_node_id: 'hub-nyc', distance_miles: 152, transit_hours: 2.75, highway_corridors: ['I-87'], scheduled_departure_hour: 23, requires_relay: false, relay_node_id: null },
  { id: 'lhr-nyc-alb', origin_node_id: 'hub-nyc',   destination_node_id: 'hub-albany', distance_miles: 152, transit_hours: 2.75, highway_corridors: ['I-87'], scheduled_departure_hour: 23, requires_relay: false, relay_node_id: null },

  // ── Trunk: Long-haul relay Buffalo → Albany via Syracuse ─────────────────

  { id: 'lhr-buf-alb', origin_node_id: 'hub-buffalo', destination_node_id: 'hub-albany', distance_miles: 298, transit_hours: 5.0, highway_corridors: ['I-90'], scheduled_departure_hour: 21, requires_relay: true, relay_node_id: 'hub-syracuse' },
  { id: 'lhr-alb-buf', origin_node_id: 'hub-albany',  destination_node_id: 'hub-buffalo', distance_miles: 298, transit_hours: 5.0, highway_corridors: ['I-90'], scheduled_departure_hour: 21, requires_relay: true, relay_node_id: 'hub-syracuse' },

  // ── Feeders: Syracuse Hub ↔ Terminals ────────────────────────────────────

  { id: 'lhr-syr-uti', origin_node_id: 'hub-syracuse', destination_node_id: 'term-utica',    distance_miles: 58,  transit_hours: 1.0,  highway_corridors: ['I-90'], scheduled_departure_hour: 3,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-uti-syr', origin_node_id: 'term-utica',   destination_node_id: 'hub-syracuse',  distance_miles: 58,  transit_hours: 1.0,  highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-syr-wat', origin_node_id: 'hub-syracuse', destination_node_id: 'term-watertown', distance_miles: 75,  transit_hours: 1.25, highway_corridors: ['I-81'], scheduled_departure_hour: 3,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-wat-syr', origin_node_id: 'term-watertown', destination_node_id: 'hub-syracuse', distance_miles: 75,  transit_hours: 1.25, highway_corridors: ['I-81'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },

  // ── Feeders: Albany Hub ↔ Terminals ──────────────────────────────────────

  { id: 'lhr-alb-bin', origin_node_id: 'hub-albany',    destination_node_id: 'term-binghamton', distance_miles: 128, transit_hours: 2.25, highway_corridors: ['I-88'], scheduled_departure_hour: 2,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-bin-alb', origin_node_id: 'term-binghamton', destination_node_id: 'hub-albany',   distance_miles: 128, transit_hours: 2.25, highway_corridors: ['I-88'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-alb-plt', origin_node_id: 'hub-albany',    destination_node_id: 'term-plattsburgh', distance_miles: 100, transit_hours: 1.75, highway_corridors: ['I-87'], scheduled_departure_hour: 3,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-plt-alb', origin_node_id: 'term-plattsburgh', destination_node_id: 'hub-albany',  distance_miles: 100, transit_hours: 1.75, highway_corridors: ['I-87'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },

  // ── Feeders: Buffalo Hub ↔ Terminals ─────────────────────────────────────

  { id: 'lhr-buf-roc', origin_node_id: 'hub-buffalo',  destination_node_id: 'term-rochester', distance_miles: 78,  transit_hours: 1.25, highway_corridors: ['I-90'], scheduled_departure_hour: 3,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-roc-buf', origin_node_id: 'term-rochester', destination_node_id: 'hub-buffalo',  distance_miles: 78,  transit_hours: 1.25, highway_corridors: ['I-90'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
  { id: 'lhr-buf-elm', origin_node_id: 'hub-buffalo',  destination_node_id: 'term-elmira',    distance_miles: 108, transit_hours: 1.75, highway_corridors: ['I-86'], scheduled_departure_hour: 3,  requires_relay: false, relay_node_id: null },
  { id: 'lhr-elm-buf', origin_node_id: 'term-elmira',  destination_node_id: 'hub-buffalo',    distance_miles: 108, transit_hours: 1.75, highway_corridors: ['I-86'], scheduled_departure_hour: 22, requires_relay: false, relay_node_id: null },
]

// ─── Hub adjacency graph for BFS routing ──────────────────────────────────
// Represents direct hub-to-hub trunk connections (I-90/I-87 backbone).

export const HUB_ADJACENCY: Record<string, string[]> = {
  'hub-buffalo':  ['hub-syracuse'],
  'hub-syracuse': ['hub-buffalo', 'hub-albany'],
  'hub-albany':   ['hub-syracuse', 'hub-nyc'],
  'hub-nyc':      ['hub-albany'],
}
