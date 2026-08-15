import type { Terminal, Truck, ManifestStop, DayPhase } from '~/types/game'

type LeafletMap = import('leaflet').Map
type LeafletMarker = import('leaflet').Marker
type LeafletPolyline = import('leaflet').Polyline

let L: typeof import('leaflet') | null = null

export const useMap = () => {
  let map: LeafletMap | null = null
  const truckMarkers = new Map<string, LeafletMarker>()
  const routeLines = new Map<string, LeafletPolyline>()
  const hubMarkers = new Map<string, LeafletMarker>()
  const stopMarkers: LeafletMarker[] = []
  let dayRoutePolyline: LeafletPolyline | null = null

  const init = async (containerEl: HTMLElement | string) => {
    if (!L) L = await import('leaflet')

    const target = typeof containerEl === 'string' ? document.getElementById(containerEl)! : containerEl

    if ((target as any)._leaflet_id) {
      ;(target as any)._leaflet_id = undefined
    }

    map = L.map(target, {
      center: [43.1009, -75.2327],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    })

    // CartoDB Dark Matter — clean dark basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    return map
  }

  const destroy = () => {
    map?.remove()
    map = null
    truckMarkers.clear()
    routeLines.clear()
    hubMarkers.clear()
    stopMarkers.forEach(m => m.remove())
    stopMarkers.length = 0
    dayRoutePolyline?.remove()
    dayRoutePolyline = null
  }

  const addTerminalMarker = (terminal: Terminal) => {
    if (!L || !map) return

    const icon = L.divIcon({
      html: `
        <div class="zone-pin">
          <div class="zone-pin__ring">
            <div class="zone-pin__inner"></div>
          </div>
          <span class="zone-pin__label">${terminal.city}</span>
        </div>
      `,
      className: '',
      iconSize: [60, 30],
      iconAnchor: [30, 7],
    })

    const marker = L.marker([terminal.lat, terminal.lng], { icon }).addTo(map!)
    hubMarkers.set(terminal.id, marker)
  }

  const addOrUpdateTruckMarker = (truck: Truck, position: [number, number]) => {
    if (!L || !map) return

    const latLng: [number, number] = [position[1], position[0]]
    const isIdle = truck.status === 'Idle'

    const truckSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 17h14V8H1v9z"/><path d="M15 17h7v-6l-2-4h-5v10z"/><circle cx="4.5" cy="18.5" r="1.5" fill="white" stroke="none"/><circle cx="18.5" cy="18.5" r="1.5" fill="white" stroke="none"/></svg>`

    const html = `
      <div class="truck-marker-wrap" title="${truck.name}">
        ${isIdle ? '' : '<div class="truck-pulse"></div>'}
        <div class="truck-core${isIdle ? ' truck-core--idle' : ''}">
          ${truckSvg}
        </div>
      </div>
    `

    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    if (truckMarkers.has(truck.id)) {
      const existing = truckMarkers.get(truck.id)!
      existing.setLatLng(latLng)
      existing.setIcon(icon)
    } else {
      const marker = L.marker(latLng, { icon }).addTo(map!)
      truckMarkers.set(truck.id, marker)
    }
  }

  const removeTruckMarker = (truckId: string) => {
    const marker = truckMarkers.get(truckId)
    if (marker) { marker.remove(); truckMarkers.delete(truckId) }
  }

  const drawRoute = (routeId: string, geometry: [number, number][], color = '#3b82f6') => {
    if (!L || !map) return

    const latLngs: [number, number][] = geometry.map(([lng, lat]) => [lat, lng])

    if (routeLines.has(routeId)) {
      routeLines.get(routeId)!.setLatLngs(latLngs)
    } else {
      const line = L.polyline(latLngs, {
        color,
        weight: 3,
        opacity: 0.65,
        dashArray: '6 5',
      }).addTo(map!)
      routeLines.set(routeId, line)
    }
  }

  const removeRoute = (routeId: string) => {
    const line = routeLines.get(routeId)
    if (line) { line.remove(); routeLines.delete(routeId) }
  }

  const flyTo = (lat: number, lng: number, zoom = 12) => {
    map?.flyTo([lat, lng], zoom, { duration: 1 })
  }

  const updateDayStopMarkers = (manifest: ManifestStop[], phase: DayPhase, currentStopIdx: number) => {
    if (!L || !map) return

    // Clear existing stop markers
    stopMarkers.forEach(m => m.remove())
    stopMarkers.length = 0

    // Clear existing day route polyline
    if (dayRoutePolyline) {
      dayRoutePolyline.remove()
      dayRoutePolyline = null
    }

    if (!manifest.length || phase === 'debrief') return

    // Draw route polyline: base → each stop in sequence order
    const coords: [number, number][] = [
      [43.1009, -75.2327],
      ...manifest.map(s => [s.job.delivery_lat, s.job.delivery_lng] as [number, number]),
    ]
    dayRoutePolyline = L.polyline(coords, {
      color: '#2563eb',
      weight: 2,
      opacity: 0.5,
      dashArray: '6 4',
    }).addTo(map!)

    // Create a marker for each stop
    manifest.forEach((stop, idx) => {
      if (!L || !map) return

      const isActive = phase === 'in_progress' && idx === currentStopIdx
      const isDone = stop.job.status === 'delivered'
      const bg = isDone ? '#94a3b8' : isActive ? '#2563eb' : 'white'
      const color = isDone ? 'white' : isActive ? 'white' : '#2563eb'
      const border = isDone ? 'none' : isActive ? 'none' : '2px solid #2563eb'
      const size = isActive ? 28 : 22

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${bg};color:${color};
          border:${border};border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${isActive ? 11 : 9}px;font-weight:900;font-family:system-ui;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);
          ${isActive ? 'animation:pulse 1.5s ease-in-out infinite;' : ''}
        ">${isDone ? '✓' : stop.sequence}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([stop.job.delivery_lat, stop.job.delivery_lng], { icon })
        .bindPopup(stop.job.customer_name)
        .addTo(map!)

      stopMarkers.push(marker)
    })
  }

  return { init, destroy, addTerminalMarker, addOrUpdateTruckMarker, removeTruckMarker, drawRoute, removeRoute, flyTo, updateDayStopMarkers }
}
