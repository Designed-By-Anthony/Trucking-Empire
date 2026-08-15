<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <h2 class="text-base font-bold" style="color: #0f172a;">Fleet</h2>
    <span class="text-xs font-medium" style="color: #94a3b8;">
      {{ fleetStore.trucks.length === 0 ? 'No vehicles' : `${fleetStore.trucks.length} vehicle${fleetStore.trucks.length > 1 ? 's' : ''}` }}
    </span>
  </div>

  <div class="modal-body p-4 flex flex-col gap-4">

    <!-- Empty fleet state -->
    <div v-if="fleetStore.trucks.length === 0" class="text-center py-6">
      <div class="text-4xl mb-3 opacity-30">🚐</div>
      <p class="text-sm font-semibold mb-1" style="color: #0f172a;">Garage is empty</p>
      <p class="text-xs leading-relaxed" style="color: #94a3b8;">Buy your first vehicle below to start taking delivery jobs</p>
    </div>

    <!-- Truck cards -->
    <div
      v-for="truck in fleetStore.trucks"
      :key="truck.id"
      class="rounded-xl p-4"
      :style="truck.maintenance_due
        ? 'background: rgba(254,242,242,0.9); border: 1px solid rgba(239,68,68,0.3);'
        : 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'"
    >
      <!-- Name + status -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <span class="text-xl leading-none">{{ truckEmoji(truck.truck_type) }}</span>
          <div>
            <p class="text-sm font-bold tracking-tight" style="color: #0f172a;">{{ truck.name }}</p>
            <p class="text-[11px] font-medium" style="color: #94a3b8;">{{ truck.truck_type }} · {{ Math.round(truck.odometer).toLocaleString() }} mi</p>
          </div>
        </div>
        <span
          class="text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 flex items-center gap-1.5"
          :style="statusStyle(truck.status)"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: currentColor;" />
          {{ statusLabel(truck.id, truck.status) }}
        </span>
      </div>

      <!-- Phase-0 P&D route progress — stop-by-stop -->
      <div v-if="(truck.status === 'EN_ROUTE' || truck.status === 'LOADING') && dayStore.truck_id === truck.id && phase0StopInfo" class="mb-3">
        <div class="flex justify-between text-[11px] font-semibold mb-1" style="color: #94a3b8;">
          <span class="truncate max-w-[60%]">{{ phase0StopInfo.customer }}</span>
          <span class="tabular-nums flex-shrink-0" style="color: #64748b;">Stop {{ phase0StopInfo.current }} / {{ phase0StopInfo.total }}</span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: `${Math.max(2, ((phase0StopInfo.current - 1) / phase0StopInfo.total) * 100)}%`,
              background: truck.status === 'LOADING' ? '#7c3aed' : '#2563eb',
            }"
          />
        </div>
      </div>

      <!-- Phase-1 hub-to-hub route progress -->
      <div v-else-if="truck.status === 'In Transit'" class="mb-3">
        <div class="flex justify-between text-[11px] font-semibold mb-1.5" style="color: #94a3b8;">
          <span>{{ originName(truck.origin_hub_id) }}</span>
          <span class="tabular-nums" style="color: #64748b;">{{ (truck.progress * 100).toFixed(0) }}%</span>
          <span>{{ destName(truck.target_hub_id) }}</span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div class="h-full rounded-full transition-all" :style="{ width: `${(truck.progress * 100).toFixed(1)}%`, background: '#3b82f6' }" />
        </div>
      </div>

      <!-- Maintenance alert -->
      <div v-if="truck.maintenance_due" class="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs font-bold" style="background: rgba(254,226,226,0.8); color: #dc2626; border: 1px solid rgba(239,68,68,0.2);">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        Maintenance required
      </div>

      <!-- Fuel + Condition -->
      <div class="flex flex-col gap-2 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider w-10 flex-shrink-0" style="color: #94a3b8;">Fuel</span>
          <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full transition-all" :style="{ width: `${((truck.fuel_level / truck.fuel_capacity) * 100).toFixed(1)}%`, background: fuelColor(truck.fuel_level / truck.fuel_capacity) }" />
          </div>
          <span class="text-[11px] tabular-nums w-7 text-right flex-shrink-0" style="color: #64748b;">{{ truck.fuel_level.toFixed(0) }}g</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider w-10 flex-shrink-0" style="color: #94a3b8;">Cond</span>
          <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full transition-all" :style="{ width: `${truck.condition.toFixed(1)}%`, background: condColor(truck.condition) }" />
          </div>
          <span class="text-[11px] tabular-nums w-7 text-right flex-shrink-0" style="color: #64748b;">{{ truck.condition.toFixed(0) }}%</span>
        </div>
      </div>

      <!-- Driver -->
      <div v-if="driverForTruck(truck.id)" class="pt-3" style="border-top: 1px solid rgba(226,232,240,0.8);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 20 20" style="color: #94a3b8;"><circle cx="10" cy="7" r="4"/><path d="M2 18c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span class="text-xs font-semibold" style="color: #334155;">{{ driverForTruck(truck.id)!.name }}</span>
          </div>
          <span class="text-[10px] font-semibold" :style="{ color: driverForTruck(truck.id)!.status === 'Off Duty' ? '#dc2626' : '#94a3b8' }">
            {{ driverForTruck(truck.id)!.status }}
          </span>
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <div class="flex justify-between text-[10px] font-semibold mb-1" style="color: #94a3b8;">
              <span>Drive HOS</span>
              <span class="tabular-nums" style="color: #64748b;">{{ driverForTruck(truck.id)!.hos_drive_remaining.toFixed(1) }}h</span>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
              <div class="h-full rounded-full" :style="{ width: `${(driverForTruck(truck.id)!.hos_drive_remaining / 11) * 100}%`, background: driverForTruck(truck.id)!.hos_drive_remaining < 3 ? '#ef4444' : '#10b981' }" />
            </div>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-[10px] font-semibold mb-1" style="color: #94a3b8;">
              <span>On-Duty</span>
              <span class="tabular-nums" style="color: #64748b;">{{ driverForTruck(truck.id)!.hos_onduty_remaining.toFixed(1) }}h</span>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
              <div class="h-full rounded-full" :style="{ width: `${(driverForTruck(truck.id)!.hos_onduty_remaining / 14) * 100}%`, background: driverForTruck(truck.id)!.hos_onduty_remaining < 4 ? '#ef4444' : '#f59e0b' }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Vehicle Shop ── -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
        <span class="text-[11px] font-bold uppercase tracking-widest px-2" style="color: #94a3b8;">Shop</span>
        <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
      </div>

      <div v-for="v in shopVehicles" :key="v.id" class="rounded-xl p-4 mb-3 last:mb-0"
        :style="v.canAfford
          ? 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'
          : 'background: rgba(248,250,252,0.5); border: 1px solid rgba(226,232,240,0.4); opacity: 0.6;'"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold tracking-tight" style="color: #0f172a;">{{ v.name }}</p>
            <p class="text-[11px] mt-0.5 leading-relaxed" style="color: #64748b;">{{ v.tagline }}</p>
          </div>
          <p class="text-sm font-black tabular-nums flex-shrink-0 ml-3" style="color: #059669;">${{ v.price.toLocaleString() }}</p>
        </div>

        <div class="flex gap-2 mb-3 flex-wrap">
          <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">
            {{ (v.max_weight_lbs / 1000).toFixed(0) }}k lbs
          </span>
          <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">
            {{ v.mpg }} mpg
          </span>
          <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">
            {{ v.speed_mph }} mph
          </span>
        </div>

        <button
          v-if="v.canAfford"
          class="w-full text-sm font-bold text-white rounded-lg py-2.5 transition-all active:scale-95"
          style="background: #059669;"
          @click="buyVehicle(v)"
        >Buy — ${{ v.price.toLocaleString() }}</button>
        <p v-else class="text-center text-[11px] font-medium py-1.5" style="color: #94a3b8;">
          Need ${{ (v.price - gameStore.company.cash).toLocaleString() }} more
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { useTerminalStore } from '~/stores/useTerminalStore'
import { useDayStore } from '~/stores/useDayStore'
import { VEHICLE_CATALOG } from '~/data/vehicles'
import type { VehicleListing } from '~/data/vehicles'
import type { TransportStatus } from '~/types/game'

const fleetStore = useFleetStore()
const gameStore = useGameStore()
const terminalStore = useTerminalStore()
const dayStore = useDayStore()

const originName = (id: string) => terminalStore.getById(id)?.city ?? id
const destName = (id: string | null) => id ? (terminalStore.getById(id)?.city ?? id) : '—'
const driverForTruck = (truckId: string) => fleetStore.getDriverForTruck(truckId)

const truckEmoji = (type: string) => {
  if (type === 'Semi' || type === 'Day Cab') return '🚛'
  if (type === 'Flatbed') return '🚚'
  return '🚐'
}

const shopVehicles = computed(() =>
  VEHICLE_CATALOG
    .filter(v => v.unlock_at_cash <= gameStore.company.cash + 60000)
    .slice(0, 4)
    .map(v => ({ ...v, canAfford: gameStore.company.cash >= v.price }))
)

const buyVehicle = (vehicle: VehicleListing & { canAfford: boolean }) => {
  if (!vehicle.canAfford) return
  fleetStore.purchaseVehicle(vehicle)
}

const fuelColor = (ratio: number) => {
  if (ratio < 0.2) return '#ef4444'
  if (ratio < 0.4) return '#f59e0b'
  return '#10b981'
}

const condColor = (pct: number) => {
  if (pct < 30) return '#ef4444'
  if (pct < 60) return '#f59e0b'
  return '#3b82f6'
}

// Phase-0 stop progress — only valid when truck is on an active P&D route
const phase0StopInfo = computed(() => {
  if (dayStore.phase !== 'in_progress' || !dayStore.truck_id) return null
  const total = dayStore.manifest.length
  const current = dayStore.current_stop_index + 1
  const stop = dayStore.manifest[dayStore.current_stop_index]
  return { current: Math.min(current, total), total, customer: stop?.job.customer_name ?? '' }
})

// Human-readable badge label — shows stop info for active P&D routes
const statusLabel = (truckId: string, status: TransportStatus): string => {
  if ((status === 'EN_ROUTE' || status === 'LOADING') && dayStore.truck_id === truckId) {
    const info = phase0StopInfo.value
    if (info) return `${status === 'LOADING' ? 'LOADING' : 'ON ROUTE'} · ${info.current}/${info.total}`
  }
  return status
}

const statusStyle = (status: TransportStatus): string => ({
  'Idle':           'background: rgba(241,245,249,0.9); color: #64748b;',
  'In Transit':     'background: rgba(219,234,254,0.8); color: #2563eb;',
  'Out of Service': 'background: rgba(254,226,226,0.8); color: #dc2626;',
  'Fueling':        'background: rgba(254,243,199,0.8); color: #d97706;',
  'Loading':        'background: rgba(237,233,254,0.8); color: #7c3aed;',
  'EN_ROUTE':       'background: rgba(219,234,254,0.9); color: #1d4ed8; animation: pulse-badge 1.5s ease-in-out infinite;',
  'LOADING':        'background: rgba(237,233,254,0.9); color: #6d28d9; animation: pulse-badge 1.5s ease-in-out infinite;',
  'LINE_HAUL':      'background: rgba(209,250,229,0.9); color: #065f46;',
}[status] ?? 'background: rgba(241,245,249,0.9); color: #64748b;')
</script>

<style scoped>
@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}
</style>
