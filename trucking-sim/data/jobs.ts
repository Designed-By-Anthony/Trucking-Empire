import type { Job } from '~/types/game'

export const SEED_JOBS: Job[] = [
  {
    id: 'job-001',
    customer_name: 'Valley National Insurance',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '180 Genesee St, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1001,
    delivery_lng: -75.2281,
    weight_lbs: 340,
    volume_ft3: 28,
    payout: 85,
    window_open: 8,
    window_close: 12,
    delivery_type: 'commercial',
    equipment_tags: [],
    status: 'pending',
    notes: 'Dock at rear of building. Ask for receiving.',
  },
  {
    id: 'job-002',
    customer_name: 'Mohawk Valley Community Rec',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '1004 Lincoln Ave, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.0997,
    delivery_lng: -75.2185,
    weight_lbs: 180,
    volume_ft3: 42,
    payout: 67,
    window_open: 9,
    window_close: 13,
    delivery_type: 'residential',
    equipment_tags: ['residential_only'],
    status: 'pending',
    notes: 'Front entrance only. No loading dock.',
  },
  {
    id: 'job-003',
    customer_name: 'CentroMed Corp',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '525 French Rd, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1072,
    delivery_lng: -75.2501,
    weight_lbs: 1200,
    volume_ft3: 95,
    payout: 175,
    window_open: 7,
    window_close: 11,
    delivery_type: 'dock',
    equipment_tags: ['dock_high', 'liftgate'],
    status: 'pending',
    notes: 'Call ahead 30 min. Dock B only.',
  },
  {
    id: 'job-004',
    customer_name: 'Cart King #42',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '740 French Rd, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1088,
    delivery_lng: -75.2489,
    weight_lbs: 680,
    volume_ft3: 60,
    payout: 95,
    window_open: 6,
    window_close: 18,
    delivery_type: 'dock',
    equipment_tags: ['dock_high'],
    status: 'pending',
  },
  {
    id: 'job-005',
    customer_name: 'Empire Health Plans',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '333 Butternut St, Utica NY 13501',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1022,
    delivery_lng: -75.2344,
    weight_lbs: 220,
    volume_ft3: 35,
    payout: 72,
    window_open: 10,
    window_close: 15,
    delivery_type: 'commercial',
    equipment_tags: [],
    status: 'pending',
  },
  {
    id: 'job-006',
    customer_name: 'Family Savings – Bleecker St',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '910 Bleecker St, Utica NY 13501',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.0966,
    delivery_lng: -75.2312,
    weight_lbs: 450,
    volume_ft3: 55,
    payout: 88,
    window_open: 8,
    window_close: 14,
    delivery_type: 'dock',
    equipment_tags: ['dock_high'],
    status: 'pending',
  },
  {
    id: 'job-007',
    customer_name: 'Residential – Barton Ave',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '47 Barton Ave, New Hartford NY 13413',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.0731,
    delivery_lng: -75.2798,
    weight_lbs: 95,
    volume_ft3: 18,
    payout: 55,
    window_open: 12,
    window_close: 17,
    delivery_type: 'residential',
    equipment_tags: ['residential_only'],
    status: 'pending',
    notes: 'Leave at door if no answer.',
  },
  {
    id: 'job-008',
    customer_name: 'Residential – Clinton Rd',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '319 Clinton Rd, Whitesboro NY 13492',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1214,
    delivery_lng: -75.2953,
    weight_lbs: 140,
    volume_ft3: 25,
    payout: 78,
    window_open: 9,
    window_close: 14,
    delivery_type: 'residential',
    equipment_tags: ['residential_only', 'liftgate'],
    status: 'pending',
    notes: 'Heavy item – liftgate required.',
  },
  {
    id: 'job-009',
    customer_name: 'Rome Industrial Steel',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '200 Depeyster St, Rome NY 13440',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.2103,
    delivery_lng: -75.4563,
    weight_lbs: 1800,
    volume_ft3: 110,
    payout: 210,
    window_open: 7,
    window_close: 10,
    delivery_type: 'dock',
    equipment_tags: ['dock_high', 'liftgate'],
    status: 'pending',
    notes: 'Strict window – plant starts at 10. Early preferred.',
  },
  {
    id: 'job-010',
    customer_name: 'Turning Creek Resort',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '5218 Patrick Rd, Verona NY 13478',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1061,
    delivery_lng: -75.5324,
    weight_lbs: 540,
    volume_ft3: 78,
    payout: 115,
    window_open: 11,
    window_close: 16,
    delivery_type: 'commercial',
    equipment_tags: [],
    status: 'pending',
    notes: 'Use service entrance on north side.',
  },
  {
    id: 'job-011',
    customer_name: 'Oneida County Office Building',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '800 Park Ave, Utica NY 13501',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1047,
    delivery_lng: -75.2418,
    weight_lbs: 280,
    volume_ft3: 32,
    payout: 76,
    window_open: 8,
    window_close: 12,
    delivery_type: 'commercial',
    equipment_tags: [],
    status: 'pending',
    notes: 'Sign in at security desk.',
  },
  {
    id: 'job-012',
    customer_name: 'Utica Self Storage',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '430 Oriskany Blvd, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.1014,
    delivery_lng: -75.2391,
    weight_lbs: 380,
    volume_ft3: 48,
    payout: 82,
    window_open: 9,
    window_close: 17,
    delivery_type: 'commercial',
    equipment_tags: [],
    status: 'pending',
  },
  {
    id: 'job-013',
    customer_name: 'Valley Tech Center – New Hartford',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '4747 Middle Settlement Rd, New Hartford NY 13413',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.0661,
    delivery_lng: -75.2877,
    weight_lbs: 160,
    volume_ft3: 22,
    payout: 65,
    window_open: 9,
    window_close: 14,
    delivery_type: 'residential',
    equipment_tags: ['residential_only'],
    status: 'pending',
  },
  {
    id: 'job-014',
    customer_name: 'Apex Materials Corp',
    pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
    delivery_address: '1676 Lincoln Ave, Utica NY 13502',
    pickup_lat: 43.1009,
    pickup_lng: -75.2327,
    delivery_lat: 43.0978,
    delivery_lng: -75.2144,
    weight_lbs: 920,
    volume_ft3: 85,
    payout: 148,
    window_open: 7,
    window_close: 11,
    delivery_type: 'dock',
    equipment_tags: ['dock_high', 'liftgate'],
    status: 'pending',
    notes: 'Hazmat paperwork required. Have BOL ready.',
  },
]

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Procedural generation customer pool (fictional play-on names) ────────

const CUSTOMERS = [
  // Venues & entertainment
  'Mohawk Valley Thunder Arena', 'Turning Creek Resort', 'Riverside Event Center',
  // Healthcare & insurance
  'Empire Health Plans', 'Valley Medical Group', 'St. Mary\'s Medical Center',
  // Banks & finance
  'Valley Trust Bank – Utica', 'Cornerstone Bank – Genesee St', 'First Federal Savings',
  // Grocery & food retail (fictional)
  'Hannigan\'s Market', 'Save-A-Buck – Utica', 'Fresh Cart – New Hartford',
  // Dollar / discount (fictional)
  'Dollar Plus – Oriskany', 'Family Savings – Bleecker', 'Bargain Barn – Whitesboro',
  // Hardware & auto (fictional)
  'Harbor Works Tools', 'APEX Auto Parts', 'First Gear Auto – Burrstone',
  // Education & government
  'Valley View College', 'Valley Tech – Sherman Dr', 'Oneida County Services',
  // Industrial & manufacturing (fictional)
  'Pioneer Products – Herkimer', 'Heritage Copper Works', 'Valley Creamery – Verona',
  // Residential (generic)
  'Residential – Elm St', 'Residential – James St', 'Residential – Sunset Ave',
  'Residential – Champlin Ave', 'Residential – Culver Ave', 'Residential – Pearl St',
]

const STREETS = [
  { name: 'Genesee St', lat: 43.101, lng: -75.228 },
  { name: 'Oriskany Blvd', lat: 43.101, lng: -75.237 },
  { name: 'Burrstone Rd', lat: 43.088, lng: -75.262 },
  { name: 'Whitesboro St', lat: 43.113, lng: -75.248 },
  { name: 'Court St', lat: 43.099, lng: -75.231 },
  { name: 'Bleecker St', lat: 43.097, lng: -75.233 },
  { name: 'Lincoln Ave', lat: 43.098, lng: -75.218 },
  { name: 'Mohawk St', lat: 43.103, lng: -75.224 },
  { name: 'Columbia St', lat: 43.106, lng: -75.240 },
  { name: 'State St', lat: 43.100, lng: -75.233 },
  { name: 'French Rd', lat: 43.108, lng: -75.249 },
  { name: 'Sunset Ave', lat: 43.091, lng: -75.244 },
  { name: 'Clinton Rd Whitesboro', lat: 43.121, lng: -75.295 },
  { name: 'Seneca Tpke New Hartford', lat: 43.075, lng: -75.278 },
  { name: 'Commercial Dr New Hartford', lat: 43.069, lng: -75.283 },
]

type DeliveryTypeLiteral = 'residential' | 'commercial' | 'dock'
type EquipmentTagLiteral = 'liftgate' | 'dock_high' | 'residential_only'

const DELIVERY_CONFIGS: Array<{
  type: DeliveryTypeLiteral
  tags: EquipmentTagLiteral[]
  weightMin: number
  weightMax: number
  volMin: number
  volMax: number
  payoutMin: number
  payoutMax: number
}> = [
  { type: 'residential', tags: ['residential_only'], weightMin: 60, weightMax: 200, volMin: 12, volMax: 40, payoutMin: 50, payoutMax: 80 },
  { type: 'residential', tags: ['residential_only', 'liftgate'], weightMin: 100, weightMax: 300, volMin: 20, volMax: 55, payoutMin: 65, payoutMax: 95 },
  { type: 'commercial', tags: [], weightMin: 150, weightMax: 500, volMin: 25, volMax: 70, payoutMin: 65, payoutMax: 110 },
  { type: 'dock', tags: ['dock_high'], weightMin: 400, weightMax: 900, volMin: 50, volMax: 100, payoutMin: 85, payoutMax: 140 },
  { type: 'dock', tags: ['dock_high', 'liftgate'], weightMin: 700, weightMax: 2000, volMin: 75, volMax: 130, payoutMin: 130, payoutMax: 220 },
]

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

export function generateDayJobs(dayNumber: number, count = 10): Job[] {
  const rng = mulberry32(dayNumber * 1337 + 42)
  const jobs: Job[] = []

  for (let i = 0; i < count; i++) {
    const streetIdx = Math.floor(rng() * STREETS.length)
    const customerIdx = Math.floor(rng() * CUSTOMERS.length)
    const configIdx = Math.floor(rng() * DELIVERY_CONFIGS.length)
    const houseNum = 100 + Math.floor(rng() * 900)
    const latJitter = (rng() - 0.5) * 0.008
    const lngJitter = (rng() - 0.5) * 0.012
    const windowOpenOptions = [7, 8, 9, 10, 11]
    const windowOpen = windowOpenOptions[Math.floor(rng() * windowOpenOptions.length)]!
    const windowDuration = 3 + Math.floor(rng() * 5)

    const street = STREETS[streetIdx]!
    const config = DELIVERY_CONFIGS[configIdx]!

    jobs.push({
      id: `gen-d${dayNumber}-${i}`,
      customer_name: CUSTOMERS[customerIdx]!,
      pickup_address: 'Terminal – 200 Oriskany Blvd, Utica NY',
      delivery_address: `${houseNum} ${street.name}, Utica NY`,
      pickup_lat: 43.1009,
      pickup_lng: -75.2327,
      delivery_lat: street.lat + latJitter,
      delivery_lng: street.lng + lngJitter,
      weight_lbs: lerp(config.weightMin, config.weightMax, rng()),
      volume_ft3: lerp(config.volMin, config.volMax, rng()),
      payout: lerp(config.payoutMin, config.payoutMax, rng()),
      window_open: windowOpen,
      window_close: Math.min(18, windowOpen + windowDuration),
      delivery_type: config.type,
      equipment_tags: [...config.tags],
      status: 'pending',
    })
  }

  return jobs
}
