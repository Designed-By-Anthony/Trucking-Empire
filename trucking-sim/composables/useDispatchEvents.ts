import { useDayStore } from '~/stores/useDayStore'
import type { DispatchEvent, Job } from '~/types/game'

export function useDispatchEvents() {
  const dayStore = useDayStore()

  // Call at day start to schedule 2-3 events across the workday
  function scheduleEvents(dayNumber: number, dayStartTick: number) {
    const rng = mulberry32(dayNumber * 1337 + 42)
    const count = 2 + Math.floor(rng() * 2)  // 2 or 3 events

    const eventHours = [9, 10.5, 13, 14.5]  // possible fire times (game hours within day)
    const baseDay = Math.floor(dayStartTick / 24) * 24  // start of this game day

    for (let i = 0; i < count; i++) {
      const fireHour = eventHours[i]
      const job = generatePickupJob(dayNumber, i, rng, fireHour)
      const event: DispatchEvent = {
        id: `ev_d${dayNumber}_${i}`,
        type: 'pickup_call',
        job,
        fires_at_tick: baseDay + fireHour,
        message: `${job.customer_name} needs a pickup — ${job.weight_lbs} lbs, ${job.volume_ft3} ft³. Window: ${fmtHour(job.window_open)}–${fmtHour(job.window_close)}.`,
        accepted: null,
        expires_at_tick: baseDay + fireHour + 1,
      }
      dayStore.queueDispatchEvent(event)
    }
  }

  // Call from game loop every tick while phase === 'in_progress'
  function tick(currentTick: number) {
    if (dayStore.phase !== 'in_progress') return
    dayStore.checkPendingEvents(currentTick)
  }

  // When a push notification should go to the player (they're away from the app)
  async function notifyIfAway(event: DispatchEvent) {
    if (typeof document === 'undefined') return
    if (document.visibilityState !== 'hidden') return
    const playerId = typeof localStorage !== 'undefined' ? localStorage.getItem('fe:pid') : null
    if (!playerId) return
    try {
      await $fetch('/api/push/send', {
        method: 'POST',
        body: { playerId, title: 'Pickup Request', body: event.message, eventId: event.id },
      })
    } catch { /* silent fail */ }
  }

  return { scheduleEvents, tick, notifyIfAway }
}

function generatePickupJob(dayNumber: number, index: number, rng: () => number, fireHour: number): Job {
  const customers = [
    'Central NY HVAC', 'Mohawk Valley Plumbing', 'Capitol Security', 'Utica Self-Storage',
    'Northeast Medical Group', 'Adirondack Beverage', 'Delta Engineers', 'Oneida Learning Co-op',
    'Riverside Industrial Park', 'Valley Printing', 'Clark Mills Dairy', 'Sangertown Suites',
  ]
  const locations = [
    { name: 'Oriskany Blvd', lat: 43.083, lng: -75.248 },
    { name: 'Erie Blvd', lat: 43.095, lng: -75.219 },
    { name: 'Commercial Dr', lat: 43.107, lng: -75.193 },
    { name: 'Whitesboro St', lat: 43.111, lng: -75.265 },
    { name: 'Kemble St', lat: 43.088, lng: -75.243 },
    { name: 'French Rd', lat: 43.073, lng: -75.291 },
  ]

  const customer = customers[Math.floor(rng() * customers.length)]
  const loc = locations[Math.floor(rng() * locations.length)]
  const weight = Math.round(80 + rng() * 420)
  const volume = Math.round(8 + rng() * 65)
  const isLiftgate = weight > 350

  return {
    id: `ej_d${dayNumber}_${index}`,
    job_type: 'pickup' as const,
    customer_name: customer,
    pickup_address: `${100 + Math.floor(rng() * 700)} ${loc.name}, Utica NY`,
    delivery_address: `${100 + Math.floor(rng() * 700)} ${loc.name}, Utica NY`,
    pickup_lat: loc.lat + (rng() - 0.5) * 0.015,
    pickup_lng: loc.lng + (rng() - 0.5) * 0.015,
    delivery_lat: loc.lat + (rng() - 0.5) * 0.015,
    delivery_lng: loc.lng + (rng() - 0.5) * 0.015,
    weight_lbs: weight,
    volume_ft3: volume,
    payout: Math.round(55 + weight * 0.1 + (isLiftgate ? 35 : 0)),
    window_open: Math.floor(fireHour),
    window_close: Math.min(17, Math.floor(fireHour) + 3),
    delivery_type: 'commercial',
    equipment_tags: isLiftgate ? ['liftgate'] : [],
    status: 'pending',
    is_emergency: true,
    notes: `Called in at ${fmtHour(fireHour)}`,
  }
}

function fmtHour(h: number): string {
  const hour = Math.floor(h) % 24
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:00 ${ampm}`
}

function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
