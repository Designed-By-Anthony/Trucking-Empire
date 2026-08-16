import { defineStore } from 'pinia'
import type { Job, DockFreight, DockFreightSource, FreightDest, FreightDestType, LineHaulOption, StagedOutbound } from '~/types/game'
import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { checkJobCompatibility } from '~/composables/useEquipmentCheck'

// ─── Terminal config ───────────────────────────────────────────────────────

const HOME_TERMINAL_ID = 'term-utica'
const HOME_LAT = 43.1009
const HOME_LNG = -75.2327
const HOME_ADDRESS = 'Utica Terminal – 200 Oriskany Blvd, Utica NY'

// ─── RNG ──────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

// ─── Dynamic Destination Demand Engine ────────────────────────────────────
// Probability split: 20% intra-regional, 60% in-network, 20% out-of-network

const INTRA_REGIONAL_DESTS: FreightDest[] = [
  { type: 'intra_regional', terminal_id: HOME_TERMINAL_ID, label: 'Utica Metro Redistribution', distance_miles: 12 },
  { type: 'intra_regional', terminal_id: HOME_TERMINAL_ID, label: 'Rome Area Local', distance_miles: 18 },
  { type: 'intra_regional', terminal_id: HOME_TERMINAL_ID, label: 'New Hartford Zone', distance_miles: 8 },
]

const IN_NETWORK_DESTS: FreightDest[] = [
  { type: 'in_network', terminal_id: 'hub-syracuse',   label: 'Syracuse Terminal',    distance_miles: 58  },
  { type: 'in_network', terminal_id: 'hub-albany',     label: 'Albany Hub',           distance_miles: 148 },
  { type: 'in_network', terminal_id: 'hub-nyc',        label: 'New York City Hub',    distance_miles: 230 },
  { type: 'in_network', terminal_id: 'hub-buffalo',    label: 'Buffalo Terminal',     distance_miles: 185 },
  { type: 'in_network', terminal_id: 'term-binghamton', label: 'Binghamton Terminal', distance_miles: 80  },
  { type: 'in_network', terminal_id: 'term-rochester', label: 'Rochester Terminal',   distance_miles: 100 },
  { type: 'in_network', terminal_id: 'term-watertown', label: 'Watertown Terminal',   distance_miles: 90  },
]

const OUT_OF_NETWORK_DESTS: FreightDest[] = [
  { type: 'out_of_network', terminal_id: null, label: 'Philadelphia, PA',  distance_miles: 260 },
  { type: 'out_of_network', terminal_id: null, label: 'Boston, MA',        distance_miles: 330 },
  { type: 'out_of_network', terminal_id: null, label: 'Pittsburgh, PA',    distance_miles: 360 },
  { type: 'out_of_network', terminal_id: null, label: 'Baltimore, MD',     distance_miles: 380 },
  { type: 'out_of_network', terminal_id: null, label: 'Newark, NJ',        distance_miles: 210 },
  { type: 'out_of_network', terminal_id: null, label: 'Hartford, CT',      distance_miles: 290 },
  { type: 'out_of_network', terminal_id: null, label: 'Providence, RI',    distance_miles: 370 },
]

function generateFreightDest(rng: () => number): FreightDest {
  const roll = rng()
  if (roll < 0.20) {
    return INTRA_REGIONAL_DESTS[Math.floor(rng() * INTRA_REGIONAL_DESTS.length)]!
  } else if (roll < 0.80) {
    return IN_NETWORK_DESTS[Math.floor(rng() * IN_NETWORK_DESTS.length)]!
  } else {
    return OUT_OF_NETWORK_DESTS[Math.floor(rng() * OUT_OF_NETWORK_DESTS.length)]!
  }
}

// ─── Line-Haul Spot Market ────────────────────────────────────────────────
// Carrier names are fictional — no real trademarks

const CARRIER_NAMES = [
  'Valley Freight Lines',
  'Empire State Carriers',
  'Northeast Relay Group',
  'Corridor Logistics',
  'Upstate Express',
  'Tri-State LTL Services',
  'Midstate Transport Co',
  'Keystone Freight Partners',
]

// Rate bands by dest type: out-of-network costs significantly more
const RATE_BANDS: Record<FreightDestType, { perLb: [number, number], perFt3: [number, number], flatMin: [number, number] }> = {
  intra_regional:  { perLb: [0.002, 0.005], perFt3: [0.15, 0.40],  flatMin: [25,  60]  },
  in_network:      { perLb: [0.006, 0.015], perFt3: [0.40, 1.00],  flatMin: [55,  120] },
  out_of_network:  { perLb: [0.014, 0.030], perFt3: [0.90, 2.00],  flatMin: [120, 250] },
}

function generateLineHaulMarket(seed: number, dayNumber: number): LineHaulOption[] {
  const rng = mulberry32(seed * 31337 + dayNumber * 17)
  const options: LineHaulOption[] = []
  let idx = 0

  const destPool = [
    ...IN_NETWORK_DESTS.slice(0, 4),   // major hubs always available
    ...OUT_OF_NETWORK_DESTS.slice(0, 3), // rotating OON options
  ]

  // 1-2 options per lane, some overlap on popular routes
  for (const dest of destPool) {
    const numOptions = dest.type === 'out_of_network' ? 1 : (rng() < 0.5 ? 2 : 1)
    for (let i = 0; i < numOptions; i++) {
      const band = RATE_BANDS[dest.type]
      const carrier = CARRIER_NAMES[Math.floor(rng() * CARRIER_NAMES.length)]!
      options.push({
        id: `lh-d${dayNumber}-${idx++}`,
        carrier,
        dest,
        rate_per_lb:  parseFloat((band.perLb[0] + rng() * (band.perLb[1] - band.perLb[0])).toFixed(4)),
        rate_per_ft3: parseFloat((band.perFt3[0] + rng() * (band.perFt3[1] - band.perFt3[0])).toFixed(2)),
        flat_min:     lerp(band.flatMin[0], band.flatMin[1], rng()),
        max_weight_lbs: 10000 + Math.floor(rng() * 15000),
        max_volume_ft3: 800 + Math.floor(rng() * 700),
        departs_day: dayNumber,
        arrives_day: dayNumber + 1,
      })
    }
  }

  return options
}

// ─── Delivery freight generation ───────────────────────────────────────────

const DELIVERY_CUSTOMERS = [
  'Valley National Insurance', 'Mohawk Valley Community Rec', 'CentroMed Corp',
  'Cart King #42', 'Empire Health Plans', 'Valley Medical Group',
  'Valley Trust Bank – Utica', 'Cornerstone Bank', 'First Federal Savings',
  'Hannigan\'s Market', 'Save-A-Buck – Utica', 'Fresh Cart – New Hartford',
  'Dollar Plus – Oriskany', 'Family Savings – Bleecker', 'Bargain Barn – Whitesboro',
  'Harbor Works Tools', 'APEX Auto Parts', 'First Gear Auto – Burrstone',
  'Valley View College', 'Valley Tech – Sherman Dr', 'Oneida County Services',
  'Pioneer Products – Herkimer', 'Valley Creamery – Verona', 'Apex Materials Corp',
  'Residential – Elm St', 'Residential – James St', 'Residential – Champlin Ave',
  'Residential – Culver Ave', 'Residential – Pearl St', 'Residential – Sunset Ave',
]

const DELIVERY_STREETS = [
  { name: 'Genesee St',           lat: 43.101, lng: -75.228 },
  { name: 'Oriskany Blvd',        lat: 43.101, lng: -75.237 },
  { name: 'Burrstone Rd',         lat: 43.088, lng: -75.262 },
  { name: 'Whitesboro St',        lat: 43.113, lng: -75.248 },
  { name: 'Court St',             lat: 43.099, lng: -75.231 },
  { name: 'Bleecker St',          lat: 43.097, lng: -75.233 },
  { name: 'Lincoln Ave',          lat: 43.098, lng: -75.218 },
  { name: 'Mohawk St',            lat: 43.103, lng: -75.224 },
  { name: 'Columbia St',          lat: 43.106, lng: -75.240 },
  { name: 'State St',             lat: 43.100, lng: -75.233 },
  { name: 'French Rd',            lat: 43.108, lng: -75.249 },
  { name: 'Sunset Ave',           lat: 43.091, lng: -75.244 },
  { name: 'Clinton Rd Whitesboro', lat: 43.121, lng: -75.295 },
  { name: 'Seneca Tpke New Hartford', lat: 43.075, lng: -75.278 },
  { name: 'Commercial Dr New Hartford', lat: 43.069, lng: -75.283 },
]

const DELIVERY_CONFIGS = [
  { type: 'residential' as const, tags: ['residential_only' as const],                           wMin: 60,  wMax: 200,  vMin: 12, vMax: 40,  pMin: 50,  pMax: 80  },
  { type: 'residential' as const, tags: ['residential_only' as const, 'liftgate' as const],      wMin: 100, wMax: 300,  vMin: 20, vMax: 55,  pMin: 65,  pMax: 95  },
  { type: 'commercial' as const,  tags: [],                                                       wMin: 150, wMax: 500,  vMin: 25, vMax: 70,  pMin: 65,  pMax: 110 },
  { type: 'dock' as const,        tags: ['dock_high' as const],                                   wMin: 400, wMax: 900,  vMin: 50, vMax: 100, pMin: 85,  pMax: 140 },
  { type: 'dock' as const,        tags: ['dock_high' as const, 'liftgate' as const],              wMin: 700, wMax: 2000, vMin: 75, vMax: 130, pMin: 130, pMax: 220 },
]

function generateDeliveryJobs(seed: number, count: number): Job[] {
  const rng = mulberry32(seed)
  const jobs: Job[] = []

  for (let i = 0; i < count; i++) {
    const street = DELIVERY_STREETS[Math.floor(rng() * DELIVERY_STREETS.length)]!
    const customer = DELIVERY_CUSTOMERS[Math.floor(rng() * DELIVERY_CUSTOMERS.length)]!
    const config = DELIVERY_CONFIGS[Math.floor(rng() * DELIVERY_CONFIGS.length)]!
    const houseNum = 100 + Math.floor(rng() * 900)
    const latJitter = (rng() - 0.5) * 0.008
    const lngJitter = (rng() - 0.5) * 0.012
    // Residential: flexible all-day window. Commercial/dock: tight 4-hour block.
    let windowOpen: number, windowClose: number
    if (config.type === 'residential') {
      windowOpen = 8
      windowClose = 18
    } else {
      const morning = rng() < 0.5
      windowOpen = morning ? (rng() < 0.5 ? 8 : 9) : (rng() < 0.5 ? 12 : 13)
      windowClose = windowOpen + 4
    }

    jobs.push({
      id: `dock-s${seed}-${i}`,
      job_type: 'delivery',
      customer_name: customer,
      pickup_address: HOME_ADDRESS,
      delivery_address: `${houseNum} ${street.name}, Utica NY`,
      pickup_lat: HOME_LAT,
      pickup_lng: HOME_LNG,
      delivery_lat: street.lat + latJitter,
      delivery_lng: street.lng + lngJitter,
      weight_lbs: lerp(config.wMin, config.wMax, rng()),
      volume_ft3: lerp(config.vMin, config.vMax, rng()),
      payout: lerp(config.pMin, config.pMax, rng()),
      window_open: windowOpen,
      window_close: windowClose,
      delivery_type: config.type,
      equipment_tags: [...config.tags],
      status: 'pending',
    })
  }

  return jobs
}

// ─── Pickup freight generation ─────────────────────────────────────────────
// Pre-booked customer pickup requests with destinations assigned by probability.

const PICKUP_CUSTOMERS = [
  { name: 'Apex Materials Corp',        address: '140 Rome-Taberg Rd, Rome NY',         lat: 43.2128, lng: -75.4557 },
  { name: 'CentroMed Corp',             address: '525 French Rd, Utica NY',             lat: 43.1072, lng: -75.2501 },
  { name: 'Heritage Copper Works',      address: '210 Whitesboro St, Utica NY',         lat: 43.113,  lng: -75.248  },
  { name: 'Harbor Works Tools',         address: '8500 Seneca Tpke, New Hartford NY',   lat: 43.069,  lng: -75.283  },
  { name: 'Pioneer Products',           address: '480 N Washington St, Herkimer NY',    lat: 43.0248, lng: -74.9882 },
  { name: 'Valley Creamery',            address: '315 Oriskany Blvd, Whitesboro NY',    lat: 43.121,  lng: -75.295  },
  { name: 'Rome Industrial Steel',      address: '889 Erie Blvd W, Rome NY',            lat: 43.218,  lng: -75.461  },
  { name: 'Valley Tech Maintenance',    address: '100 Sherman Dr, Utica NY',            lat: 43.0997, lng: -75.2185 },
  { name: 'APEX Auto Parts',            address: '200 Burrstone Rd, Utica NY',          lat: 43.088,  lng: -75.262  },
  { name: 'Cornerstone Bank HQ',        address: '188 Genesee St, Utica NY',            lat: 43.101,  lng: -75.228  },
  { name: 'Mohawk Valley Thunder Arena', address: '400 Oriskany St W, Utica NY',        lat: 43.101,  lng: -75.237  },
  { name: 'Valley View College',        address: '1101 Sherman Dr, Utica NY',           lat: 43.0997, lng: -75.2185 },
  { name: 'Hannigan\'s Market',         address: '600 French Rd, Utica NY',             lat: 43.108,  lng: -75.249  },
  { name: 'First Gear Auto',            address: '4000 Commercial Dr, New Hartford NY', lat: 43.069,  lng: -75.270  },
]

function generateScheduledPickups(seed: number, count: number): Job[] {
  const rng = mulberry32(seed * 9999 + 777)
  const destRng = mulberry32(seed * 4441 + 333)
  const jobs: Job[] = []
  const shuffled = [...PICKUP_CUSTOMERS].sort(() => rng() - 0.5)

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const customer = shuffled[i]!
    // Pickups are commercial or dock — tight 4-hour windows
    const morning = rng() < 0.5
    const windowOpen = morning ? (rng() < 0.5 ? 8 : 9) : (rng() < 0.5 ? 12 : 13)
    const windowClose = windowOpen + 4
    const weightLbs = lerp(80, 600, rng())
    const volumeFt3 = lerp(10, 80, rng())
    const payout = lerp(55, 130, rng())
    const isHeavy = weightLbs > 400
    const dest = generateFreightDest(destRng)

    jobs.push({
      id: `pu-d${seed}-${i}`,
      job_type: 'pickup',
      freight_dest: dest,
      customer_name: customer.name,
      pickup_address: customer.address,
      delivery_address: HOME_ADDRESS,
      pickup_lat: customer.lat,
      pickup_lng: customer.lng,
      delivery_lat: HOME_LAT,
      delivery_lng: HOME_LNG,
      weight_lbs: weightLbs,
      volume_ft3: volumeFt3,
      payout,
      window_open: windowOpen,
      window_close: windowClose,
      delivery_type: isHeavy ? 'dock' : 'commercial',
      equipment_tags: isHeavy ? ['liftgate'] : [],
      status: 'pending',
    })
  }

  return jobs
}

// Demurrage starts after 3 days — $30/day per item thereafter
const DEMURRAGE_GRACE_DAYS = 3
const DEMURRAGE_DAILY_RATE = 30

// Physical dock capacity hard-cap
const DOCK_MAX_VOLUME_FT3 = 2500
const CONGESTION_DAILY_PENALTY = 200

// ─── Store ─────────────────────────────────────────────────────────────────

export const useNetworkStore = defineStore('network', {
  state: () => ({
    // Inbound delivery freight sitting on the terminal dock
    dock: [] as DockFreight[],
    // Completed pickup jobs staged on outbound dock awaiting carrier assignment
    outbound_staged: [] as StagedOutbound[],
    // Today's spot-market line-haul carrier options
    line_haul_market: [] as LineHaulOption[],
    initialized: false,
    // Globally incrementing supplement purchase counter — unique seed per buy
    supplement_purchase_count: 0,
  }),

  getters: {
    available_deliveries(): Job[] {
      return this.dock
        .filter(f => f.status === 'available')
        .map(f => f.job)
    },

    dock_available_count(): number {
      return this.dock.filter(f => f.status === 'available').length
    },

    dock_volume_ft3(): number {
      return this.dock
        .filter(f => f.status === 'available' || f.status === 'on_manifest')
        .reduce((sum, f) => sum + (f.job.volume_ft3 ?? 0), 0)
    },

    dock_max_volume_ft3(): number {
      return DOCK_MAX_VOLUME_FT3
    },

    dock_is_congested(): boolean {
      return this.dock_volume_ft3 >= DOCK_MAX_VOLUME_FT3
    },

    // Inbound dock items that no owned truck can accept (wrong equipment)
    dock_incompatible(): DockFreight[] {
      const fleetStore = useFleetStore()
      return this.dock.filter(f => {
        if (f.status !== 'available') return false
        return !fleetStore.trucks.some(t => checkJobCompatibility(f.job, t).ok)
      })
    },

    dock_incompatible_count(): number {
      return this.dock_incompatible.length
    },

    // Count of inbound items expiring at the next overnight refresh (3 days old today)
    dock_expiring_count(): (currentDay: number) => number {
      return (currentDay: number) =>
        this.dock.filter(f => f.status === 'available' && currentDay - f.day_arrived === 3).length
    },

    // Outbound freight waiting for the player to assign a carrier
    outbound_pending(): StagedOutbound[] {
      return this.outbound_staged.filter(o => o.status === 'dock_pending')
    },

    outbound_count(): number {
      return this.outbound_staged.filter(o => o.status === 'dock_pending' || o.status === 'carrier_assigned').length
    },

    // Carrier options for a specific destination
    market_for_dest(): (terminalId: string | null, destType: string) => LineHaulOption[] {
      return (terminalId, destType) =>
        this.line_haul_market.filter(o =>
          destType === 'intra_regional'
            ? o.dest.type === 'intra_regional'
            : (o.dest.terminal_id === terminalId || (terminalId === null && o.dest.type === 'out_of_network'))
        )
    },
  },

  actions: {
    // Day 1 seeding — fills dock with 24 items representing pre-shift arrivals
    seedDay1() {
      if (this.initialized) return
      const jobs = generateDeliveryJobs(0, 24)
      for (const job of jobs) {
        this.dock.push({
          id: `df-${job.id}`,
          job,
          terminal_id: HOME_TERMINAL_ID,
          status: 'available',
          source: 'initial_seed',
          day_arrived: 0,
        })
      }
      this.line_haul_market = generateLineHaulMarket(0, 0)
      this.initialized = true
    },

    // Mark dock freight as committed to manifest — blocks double-assignment
    consumeDelivery(jobId: string) {
      const item = this.dock.find(f => f.job.id === jobId)
      if (item) item.status = 'on_manifest'
    },

    // Mark a dock item as delivered so it clears at the next refresh
    markDelivered(jobId: string) {
      const item = this.dock.find(f => f.job.id === jobId)
      if (item) item.status = 'delivered'
    },

    // Return freight to available if player removes it from manifest
    restoreDelivery(jobId: string) {
      const item = this.dock.find(f => f.job.id === jobId)
      if (item) {
        item.status = 'available'
        item.job.status = 'pending'
      }
    },

    // End-of-day: driver completed a pickup, stage it on outbound dock.
    // Destination was assigned at job generation time and lives on job.freight_dest.
    stagePickupAsOutbound(job: Job, dayNumber: number) {
      const dest: FreightDest = job.freight_dest ?? {
        type: 'in_network',
        terminal_id: 'hub-syracuse',
        label: 'Syracuse Terminal',
        distance_miles: 58,
      }
      this.outbound_staged.push({
        id: `ob-${job.id}`,
        job,
        terminal_id: HOME_TERMINAL_ID,
        dest,
        day_staged: dayNumber,
        status: 'dock_pending',
        carrier_mode: null,
        line_haul_id: null,
        carrier_cost: 0,
        broker_fee: 0,
        demurrage_paid: 0,
      })

      // Mark corresponding dock freight as delivered
      for (const item of this.dock) {
        if (item.status === 'on_manifest') item.status = 'delivered'
      }
    },

    // ── Carrier Selection Mode 2: Rented Line-Haul Capacity ───────────────
    // Books a spot-market carrier for tonight's run.
    // Cost = max(flat_min, weight × rate_per_lb + volume × rate_per_ft3).
    // Returns false if cash is insufficient or option/freight not found.
    rentLineHaulCapacity(outboundId: string, optionId: string): boolean {
      const gameStore = useGameStore()
      const freight = this.outbound_staged.find(o => o.id === outboundId)
      const option = this.line_haul_market.find(o => o.id === optionId)
      if (!freight || !option || freight.status !== 'dock_pending') return false

      const cost = Math.max(
        option.flat_min,
        freight.job.weight_lbs * option.rate_per_lb + freight.job.volume_ft3 * option.rate_per_ft3
      )
      const rounded = Math.ceil(cost)
      if (gameStore.company.cash < rounded) return false

      gameStore.deductCash(rounded, 'overhead')
      freight.carrier_cost = rounded
      freight.carrier_mode = 'rented'
      freight.line_haul_id = optionId
      freight.status = 'carrier_assigned'
      return true
    },

    // ── Carrier Selection Mode 3: Brokerage Sale ──────────────────────────
    // Sells the load to a broker. Broker keeps 15–25% of the job payout.
    // Cash deducted immediately (broker fee is a clawback from already-credited revenue).
    // Returns the fee amount, or 0 if freight not found/already committed.
    sellToBroker(outboundId: string): number {
      const gameStore = useGameStore()
      const freight = this.outbound_staged.find(o => o.id === outboundId)
      if (!freight || freight.status !== 'dock_pending') return 0

      // Fee band: out-of-network loads get better broker terms (they know those lanes)
      const feeRate = freight.dest.type === 'out_of_network'
        ? 0.15 + Math.random() * 0.05   // 15–20%
        : 0.20 + Math.random() * 0.05   // 20–25%

      const fee = Math.ceil(freight.job.payout * feeRate)
      gameStore.deductCash(fee, 'overhead')

      freight.broker_fee = fee
      freight.carrier_mode = 'brokered'
      freight.status = 'brokered'
      return fee
    },

    // Refresh spot-market carrier options each morning
    refreshLineHaulMarket(dayNumber: number) {
      this.line_haul_market = generateLineHaulMarket(dayNumber, dayNumber)
    },

    // Night cycle: only freight with an assigned carrier departs.
    // Brokered freight already cleared; dock_pending freight stays put.
    processNightCycle(_dayNumber: number) {
      this.outbound_staged = this.outbound_staged
        .filter(o => o.status === 'dock_pending')  // keep waiting items
      // carrier_assigned and brokered items depart/clear — removed from staging
    },

    // Demurrage: charge $30/day for outbound freight sitting > 3 days.
    // Called at the start of each new day before building the morning board.
    applyDemurrage(currentDay: number) {
      const gameStore = useGameStore()
      let totalFees = 0
      for (const freight of this.outbound_staged) {
        if (freight.status !== 'dock_pending') continue
        const daysOnDock = currentDay - freight.day_staged
        if (daysOnDock > DEMURRAGE_GRACE_DAYS) {
          freight.demurrage_paid += DEMURRAGE_DAILY_RATE
          totalFees += DEMURRAGE_DAILY_RATE
        }
      }
      if (totalFees > 0) {
        gameStore.deductCash(totalFees, 'overhead')
      }
    },

    // Read-only demurrage total for the daily ledger preview (does not deduct).
    computeDemurrageTotal(currentDay: number): number {
      let total = 0
      for (const freight of this.outbound_staged) {
        if (freight.status !== 'dock_pending') continue
        if (currentDay - freight.day_staged > DEMURRAGE_GRACE_DAYS) total += DEMURRAGE_DAILY_RATE
      }
      return total
    },

    // Apply the $200/day congestion penalty and return the amount charged (0 if not congested).
    applyCongestionPenalty(): number {
      if (!this.dock_is_congested) return 0
      const gameStore = useGameStore()
      gameStore.deductCash(CONGESTION_DAILY_PENALTY, 'overhead')
      return CONGESTION_DAILY_PENALTY
    },

    // Broker out an inbound dock item the player can't deliver (wrong equipment).
    // Credits 65% of the job payout as a pass-through fee — better than letting it expire.
    brokerInboundFreight(dockItemId: string): number {
      const gameStore = useGameStore()
      const item = this.dock.find(f => f.id === dockItemId && f.status === 'available')
      if (!item) return 0
      const credit = Math.ceil(item.job.payout * 0.65)
      gameStore.addCash(credit, 'delivery')
      item.status = 'delivered'   // clears at next refresh
      return credit
    },

    // Purchase a supplemental freight batch from a load broker when dock is low.
    // Returns false if insufficient cash.
    purchaseFreightSupplement(dayNumber: number, count: number, cost: number): boolean {
      const gameStore = useGameStore()
      if (gameStore.company.cash < cost) return false
      gameStore.deductCash(cost, 'overhead')
      // Globally unique seed: counter never resets so repeat buys always differ
      this.supplement_purchase_count++
      const jobs = generateDeliveryJobs(dayNumber * 7919 + this.supplement_purchase_count * 1301 + count, count)
      for (const job of jobs) {
        this.dock.push({
          id: `df-sup-d${dayNumber}-${job.id}`,
          job: { ...job, id: `sup-d${dayNumber}-${job.id}` },
          terminal_id: HOME_TERMINAL_ID,
          status: 'available',
          source: 'line_haul_arrival',
          day_arrived: dayNumber,
        })
      }
      return true
    },

    // Purge delivered dock items and seed fresh overnight arrivals.
    // Called at the top of each new day before building the morning board.
    refreshDailyFreight(dayNumber: number) {
      // Reset any on_manifest orphans from the previous day back to available so they
      // re-enter the job board. Items not delivered during a route end up here when a
      // driver runs out of HOS or the day ends before all stops are completed.
      for (const item of this.dock) {
        if (item.status === 'on_manifest') {
          item.status = 'available'
          item.job.status = 'pending'
        }
      }
      // Remove delivered items and items that have sat 4+ days (returned to shipper)
      this.dock = this.dock.filter(f => {
        if (f.status === 'delivered') return false
        if (f.status === 'available' && dayNumber - f.day_arrived >= 4) return false
        return true
      })
      // Also evict outbound items that sat 7+ days without a carrier
      this.outbound_staged = this.outbound_staged.filter(o => {
        if (o.status !== 'dock_pending') return true
        return dayNumber - o.day_staged < 7
      })
      // Block overnight arrivals when dock is at physical capacity
      if (this.dock_is_congested) return
      const count = 8 + (dayNumber % 5)  // 8–12 items, varies by day
      const jobs = generateDeliveryJobs(dayNumber * 7331 + 1009, count)
      for (const job of jobs) {
        // Stop adding once we hit the cap
        if (this.dock_volume_ft3 + (job.volume_ft3 ?? 0) > DOCK_MAX_VOLUME_FT3) break
        this.dock.push({
          id: `df-d${dayNumber}-${job.id}`,
          job: { ...job, id: `arr-d${dayNumber}-${job.id}` },
          terminal_id: HOME_TERMINAL_ID,
          status: 'available',
          source: 'line_haul_arrival',
          day_arrived: dayNumber,
        })
      }
    },

    // Build morning board: inbound deliveries from dock + pre-booked pickups
    buildMorningBoard(dayNumber: number): { deliveries: Job[], pickups: Job[] } {
      const deliveries = this.available_deliveries
      const pickups = generateScheduledPickups(dayNumber, 5)
      return { deliveries, pickups }
    },

    // Direct dock injection for future line-haul arrivals (player-owned equipment)
    addToDock(job: Job, source: DockFreightSource, dayNumber: number) {
      this.dock.push({
        id: `df-ext-${job.id}`,
        job,
        terminal_id: HOME_TERMINAL_ID,
        status: 'available',
        source,
        day_arrived: dayNumber,
      })
    },
  },
})
