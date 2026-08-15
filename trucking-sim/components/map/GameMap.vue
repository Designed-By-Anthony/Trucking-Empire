<template>
  <div ref="mapContainer" class="leaflet-fill" />
</template>

<script setup lang="ts">
import { useMap } from '~/composables/useMap'
import { useRouting } from '~/composables/useRouting'
import { useFleetStore } from '~/stores/useFleetStore'
import { useTerminalStore } from '~/stores/useTerminalStore'
import { useDayStore } from '~/stores/useDayStore'

const mapContainer = ref<HTMLElement | null>(null)
const mapReady = ref(false)
const fleetStore = useFleetStore()
const terminalStore = useTerminalStore()
const dayStore = useDayStore()
const { init, destroy, addTerminalMarker, addOrUpdateTruckMarker, removeTruckMarker, drawRoute, removeRoute, updateDayStopMarkers } = useMap()
const { interpolatePosition } = useRouting()

let rafId: number | null = null

// Wait until the container has real pixel dimensions before initialising Leaflet.
// Falls back after 3 s so headless / zero-dimension environments don't hang forever.
function waitForDimensions(el: HTMLElement, signal: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 3000
    const check = () => {
      if (signal.cancelled) return reject(new Error('cancelled'))
      if (el.clientWidth > 0 && el.clientHeight > 0) return resolve()
      if (Date.now() >= deadline) return resolve()
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
  })
}

onMounted(async () => {
  if (!mapContainer.value) return
  const signal = { cancelled: false }

  try {
    await waitForDimensions(mapContainer.value, signal)
  } catch {
    return // cancelled on unmount
  }
  if (!mapContainer.value) return

  const leafletMap = await init(mapContainer.value)

  // One explicit invalidate right after init so Leaflet commits to the
  // correct container size before any ResizeObserver fires.
  leafletMap.invalidateSize({ animate: false })

  // Debounce the observer so rapid size changes (e.g. panel open/close)
  // don't trigger two tile-grid loads simultaneously.
  let resizeTimer: ReturnType<typeof setTimeout>
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => leafletMap.invalidateSize({ animate: false }), 100)
  })
  ro.observe(mapContainer.value)

  terminalStore.unlocked.forEach(terminal => addTerminalMarker(terminal))
  mapReady.value = true
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  destroy()
})

watch(
  () => fleetStore.activeTrucks,
  (activeTrucks, prevTrucks) => {
    if (!mapReady.value) return
    const activeIds = new Set(activeTrucks.map(t => t.id))
    prevTrucks?.forEach(t => {
      if (!activeIds.has(t.id)) { removeTruckMarker(t.id); removeRoute(t.id) }
    })
    activeTrucks.forEach(truck => {
      if (!truck.route_geometry?.length) return
      drawRoute(truck.id, truck.route_geometry)
      const pos = interpolatePosition(truck.route_geometry, truck.progress)
      addOrUpdateTruckMarker(truck, pos)
    })
  },
  { deep: true },
)

watch(
  () => fleetStore.trucks.filter(t => t.status === 'Idle'),
  (idleTrucks) => {
    if (!mapReady.value) return
    idleTrucks.forEach(truck => {
      const terminal = terminalStore.getById(truck.origin_hub_id)
      if (!terminal) return
      const offset = 0.002 * (parseInt(truck.id.slice(-3)) % 3)
      addOrUpdateTruckMarker(truck, [terminal.lng + offset, terminal.lat + offset])
    })
  },
  { deep: true, immediate: true },
)

watch(
  () => [dayStore.manifest, dayStore.phase, dayStore.current_stop_index] as const,
  () => {
    if (!mapReady.value) return
    updateDayStopMarkers(dayStore.manifest, dayStore.phase, dayStore.current_stop_index)
  },
  { deep: true },
)
</script>

<style>
.leaflet-fill {
  position: absolute;
  inset: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
</style>
