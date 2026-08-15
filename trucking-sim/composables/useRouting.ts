import type { RouteResult, RouteProvider, TransportMode } from '~/types/game'

const routeCache = new Map<string, RouteResult>()

const MILES_PER_METER = 0.000621371
const HOURS_PER_SECOND = 1 / 3600

const osrmProvider: RouteProvider = async (originLat, originLng, destLat, destLng) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&overview=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`)
  const data = await res.json()
  const route = data.routes[0]
  const coords: [number, number][] = route.geometry.coordinates
  return {
    geometry: coords,
    distance_miles: route.distance * MILES_PER_METER,
    duration_hours: route.duration * HOURS_PER_SECOND,
  }
}

const routeProviders: Record<TransportMode, RouteProvider> = {
  ground: osrmProvider,
  air: async () => { throw new Error('Air routing not yet implemented') },
  sea: async () => { throw new Error('Sea routing not yet implemented') },
  intermodal: async () => { throw new Error('Intermodal routing not yet implemented') },
}

export const useRouting = () => {
  const getRoute = async (
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    mode: TransportMode = 'ground',
  ): Promise<RouteResult> => {
    const key = `${mode}:${originLng.toFixed(4)},${originLat.toFixed(4)};${destLng.toFixed(4)},${destLat.toFixed(4)}`
    const cached = routeCache.get(key)
    if (cached) return cached

    const provider = routeProviders[mode]
    const result = await provider(originLat, originLng, destLat, destLng)
    routeCache.set(key, result)
    return result
  }

  const interpolatePosition = (geometry: [number, number][], progress: number): [number, number] => {
    if (!geometry || geometry.length === 0) return [0, 0]
    if (progress <= 0) return geometry[0]!
    if (progress >= 1) return geometry[geometry.length - 1]!

    const lengths: number[] = []
    let total = 0
    for (let i = 1; i < geometry.length; i++) {
      const prev = geometry[i - 1]!
      const curr = geometry[i]!
      const dx = curr[0] - prev[0]
      const dy = curr[1] - prev[1]
      const len = Math.sqrt(dx * dx + dy * dy)
      lengths.push(len)
      total += len
    }

    let target = progress * total
    for (let i = 0; i < lengths.length; i++) {
      const segLen = lengths[i]!
      if (target <= segLen) {
        const t = segLen > 0 ? target / segLen : 0
        const a = geometry[i]!
        const b = geometry[i + 1]!
        return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
      }
      target -= segLen
    }

    return geometry[geometry.length - 1]!
  }

  return { getRoute, interpolatePosition }
}
