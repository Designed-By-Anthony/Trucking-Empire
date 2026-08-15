// Delivery zones by phase. Each zone used as a pickup/dropoff location.
// Stored as Terminal-compatible objects so existing routing code works without changes.
import type { Terminal } from '~/types/game'

export type Phase = 0 | 1 | 2 | 3

// Phase 0 — local van: Utica metro, within ~8 miles
export const LOCAL_ZONES: Terminal[] = [
  { id: 'z-downtown', type: 'terminal', name: 'Downtown Utica', city: 'Downtown Utica', state: 'NY', lat: 43.1009, lng: -75.2327, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-cornhill',  type: 'terminal', name: 'Cornhill',       city: 'Cornhill',       state: 'NY', lat: 43.0909, lng: -75.2460, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-east',     type: 'terminal', name: 'East Utica',     city: 'East Utica',     state: 'NY', lat: 43.1050, lng: -75.2100, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-newhartford', type: 'terminal', name: 'New Hartford', city: 'New Hartford', state: 'NY', lat: 43.0631, lng: -75.2952, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-whitesboro',  type: 'terminal', name: 'Whitesboro',   city: 'Whitesboro',   state: 'NY', lat: 43.1256, lng: -75.2924, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-marcy',    type: 'terminal', name: 'Marcy',           city: 'Marcy',         state: 'NY', lat: 43.1662, lng: -75.2703, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-nymills',  type: 'terminal', name: 'New York Mills', city: 'New York Mills', state: 'NY', lat: 43.1048, lng: -75.2938, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-yorkville', type: 'terminal', name: 'Yorkville',     city: 'Yorkville',     state: 'NY', lat: 43.1090, lng: -75.2675, doors: 0, overhead_per_hr: 0, unlocked: true },
]

// Phase 1 — box truck: + surrounding towns within ~35 miles
export const REGIONAL_ZONES: Terminal[] = [
  ...LOCAL_ZONES,
  { id: 'z-rome',      type: 'terminal', name: 'Rome',       city: 'Rome',       state: 'NY', lat: 43.2128, lng: -75.4557, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-herkimer',  type: 'terminal', name: 'Herkimer',   city: 'Herkimer',   state: 'NY', lat: 43.0248, lng: -74.9882, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-frankfort', type: 'terminal', name: 'Frankfort',  city: 'Frankfort',  state: 'NY', lat: 43.0462, lng: -74.9968, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-ilion',     type: 'terminal', name: 'Ilion',      city: 'Ilion',      state: 'NY', lat: 43.0120, lng: -74.9965, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-clinton',   type: 'terminal', name: 'Clinton',    city: 'Clinton',    state: 'NY', lat: 43.0481, lng: -75.3783, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-oneida',    type: 'terminal', name: 'Oneida',     city: 'Oneida',     state: 'NY', lat: 43.0748, lng: -75.6516, doors: 0, overhead_per_hr: 0, unlocked: true },
]

// Phase 2 — day cab: + regional cities within ~200 miles
export const FREIGHT_ZONES: Terminal[] = [
  ...REGIONAL_ZONES,
  { id: 'z-albany',    type: 'terminal', name: 'Albany',     city: 'Albany',     state: 'NY', lat: 42.6526, lng: -73.7562, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-syracuse',  type: 'terminal', name: 'Syracuse',   city: 'Syracuse',   state: 'NY', lat: 43.0481, lng: -76.1474, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-binghamton',type: 'terminal', name: 'Binghamton', city: 'Binghamton', state: 'NY', lat: 42.0987, lng: -75.9179, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-watertown', type: 'terminal', name: 'Watertown',  city: 'Watertown',  state: 'NY', lat: 43.9748, lng: -75.9066, doors: 0, overhead_per_hr: 0, unlocked: true },
]

// Phase 3 — semi: full Northeast
export const EMPIRE_ZONES: Terminal[] = [
  ...FREIGHT_ZONES,
  { id: 'z-buffalo',   type: 'terminal', name: 'Buffalo',    city: 'Buffalo',    state: 'NY', lat: 42.8864, lng: -78.8784, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-rochester', type: 'terminal', name: 'Rochester',  city: 'Rochester',  state: 'NY', lat: 43.1566, lng: -77.6088, doors: 0, overhead_per_hr: 0, unlocked: true },
  { id: 'z-nyc',       type: 'terminal', name: 'New York City', city: 'New York City', state: 'NY', lat: 40.7128, lng: -74.0060, doors: 0, overhead_per_hr: 0, unlocked: true },
]

export const ZONES_BY_PHASE: Terminal[][] = [
  LOCAL_ZONES,
  REGIONAL_ZONES,
  FREIGHT_ZONES,
  EMPIRE_ZONES,
]
