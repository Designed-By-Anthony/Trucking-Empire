// composables/useRoutePlanner.ts
import type { ManifestStop } from '~/types/game'
import { serviceHoursForStop } from '~/composables/useServiceTime'

export interface StopETA {
  job_id: string
  arrival_game_hour: number
  departure_game_hour: number
  is_on_time: boolean
  drive_time_hours: number
}

export interface RoutePlan {
  stops: StopETA[]
  total_drive_hours: number
  stem_time_hours: number
  in_zone_hours: number
  density_score: number
  estimated_return_hour: number
}

const BASE_LAT = 43.1009
const BASE_LNG = -75.2327
const AVG_SPEED_MPH = 22
const LAT_MILES = 69.0
const LNG_MILES = 52.7           // at lat 43°N

function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * LAT_MILES
  const dLng = (lng2 - lng1) * LNG_MILES
  return Math.sqrt(dLat ** 2 + dLng ** 2)
}

function serviceH(stop: ManifestStop): number {
  return serviceHoursForStop(stop)
}

export function useRoutePlanner() {
  function planRoute(stops: ManifestStop[], departureHour: number): RoutePlan {
    if (stops.length === 0) {
      return {
        stops: [],
        total_drive_hours: 0,
        stem_time_hours: 0,
        in_zone_hours: 0,
        density_score: 100,
        estimated_return_hour: departureHour,
      }
    }

    let lat = BASE_LAT, lng = BASE_LNG, hour = departureHour
    const result: StopETA[] = []

    for (const stop of stops) {
      const svc = serviceH(stop)
      const d = dist(lat, lng, stop.job.delivery_lat, stop.job.delivery_lng)
      const driveH = d / AVG_SPEED_MPH
      hour += driveH
      const arrival = hour
      result.push({
        job_id: stop.job.id,
        arrival_game_hour: arrival,
        departure_game_hour: arrival + svc,
        is_on_time: arrival <= stop.job.window_close,
        drive_time_hours: driveH,
      })
      lat = stop.job.delivery_lat
      lng = stop.job.delivery_lng
      hour += svc
    }

    // Return leg: drive from last stop back to terminal
    const last = stops[stops.length - 1]!
    const returnDist = dist(last.job.delivery_lat, last.job.delivery_lng, BASE_LAT, BASE_LNG)
    const returnH = returnDist / AVG_SPEED_MPH
    const returnHour = hour + returnH

    const firstStem = dist(BASE_LAT, BASE_LNG, stops[0]!.job.delivery_lat, stops[0]!.job.delivery_lng) / AVG_SPEED_MPH
    const stemTime = firstStem + returnH
    const inZone = result.reduce((s, r, i) => s + serviceH(stops[i]!), 0)
    const totalDrive = result.reduce((s, r) => s + r.drive_time_hours, 0) + stemTime

    // Density across non-terminal stops only
    const realStops = stops.filter(s => s.stop_type !== 'terminal_return')
    const lats = realStops.map(s => s.job.delivery_lat)
    const lngs = realStops.map(s => s.job.delivery_lng)
    const spreadMi = realStops.length < 2 ? 0 : Math.sqrt(
      ((Math.max(...lats) - Math.min(...lats)) * LAT_MILES) ** 2 +
      ((Math.max(...lngs) - Math.min(...lngs)) * LNG_MILES) ** 2
    )
    const density = Math.max(0, Math.round(100 - (spreadMi / 12) * 100))

    return {
      stops: result,
      total_drive_hours: totalDrive,
      stem_time_hours: stemTime,
      in_zone_hours: inZone,
      density_score: density,
      estimated_return_hour: returnHour,
    }
  }

  // Update eta_game_hour on each manifest stop in-place
  function updateETAs(
    manifest: ManifestStop[],
    currentLat: number,
    currentLng: number,
    currentGameHour: number,
  ) {
    let lat = currentLat, lng = currentLng, hour = currentGameHour
    for (const stop of manifest) {
      if (stop.job.status === 'delivered') continue
      const svc = serviceH(stop)
      const d = dist(lat, lng, stop.job.delivery_lat, stop.job.delivery_lng)
      hour += d / AVG_SPEED_MPH
      stop.eta_game_hour = hour
      lat = stop.job.delivery_lat
      lng = stop.job.delivery_lng
      hour += svc
    }
  }

  return { planRoute, updateETAs }
}
