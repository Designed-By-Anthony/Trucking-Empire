<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <h2 class="text-base font-bold" style="color: #0f172a;">Fleet</h2>
    <!-- Garage / Roster tab pills -->
    <div class="flex items-center gap-1 p-1 rounded-lg" style="background: rgba(241,245,249,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <button
        v-for="tab in ['Garage', 'Roster']"
        :key="tab"
        @click="activeTab = tab as 'Garage' | 'Roster'"
        class="text-[11px] font-black px-3 py-1 rounded-md transition-all duration-150"
        :style="activeTab === tab
          ? 'background: #2563eb; color: white;'
          : 'color: #64748b;'"
      >{{ tab }}</button>
    </div>
  </div>

  <div class="modal-body p-4 flex flex-col gap-4" style="overflow-y: auto;">

    <!-- ════════════════════════════════════ GARAGE TAB ════════════════════════════════════ -->
    <template v-if="activeTab === 'Garage'">

      <!-- Empty garage -->
      <div v-if="fleetStore.trucks.length === 0" class="text-center py-8">
        <div class="mx-auto mb-3 w-14 h-14 rounded-2xl flex items-center justify-center" style="background: rgba(219,234,254,0.6); border: 1px solid rgba(147,197,253,0.4);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 17h14V8H1v9zM15 17h7v-6l-2-4h-5v10zM4.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM18.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
          </svg>
        </div>
        <p class="text-sm font-bold mb-1" style="color: #0f172a;">Garage is empty</p>
        <p class="text-xs" style="color: #94a3b8;">Buy your first vehicle from the Shop below</p>
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
        <!-- Name + status badge -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl leading-none">{{ truckEmoji(truck.truck_type) }}</span>
            <div>
              <p class="text-sm font-bold tracking-tight" style="color: #0f172a;">{{ truck.name }}</p>
              <p class="text-[11px] font-medium" style="color: #94a3b8;">{{ truck.truck_type }} · {{ Math.round(truck.odometer).toLocaleString() }} mi</p>
            </div>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 flex items-center gap-1.5" :style="statusStyle(truck.status)">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: currentColor;" />
            {{ statusLabel(truck.id, truck.status) }}
          </span>
        </div>

        <!-- P&D route progress -->
        <div v-if="(truck.status === 'EN_ROUTE' || truck.status === 'LOADING') && routeForTruck(truck.id) && routeStopInfo(truck.id)" class="mb-3">
          <div class="flex justify-between text-[11px] font-semibold mb-1" style="color: #94a3b8;">
            <span class="truncate max-w-[60%]">{{ routeStopInfo(truck.id)!.customer }}</span>
            <span class="tabular-nums flex-shrink-0" style="color: #64748b;">Stop {{ routeStopInfo(truck.id)!.current }} / {{ routeStopInfo(truck.id)!.total }}</span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full transition-all duration-500"
              :style="{ width: `${Math.max(2, ((routeStopInfo(truck.id)!.current - 1) / routeStopInfo(truck.id)!.total) * 100)}%`, background: truck.status === 'LOADING' ? '#7c3aed' : '#2563eb' }" />
          </div>
        </div>

        <!-- Maintenance alert + service button -->
        <div v-if="truck.maintenance_due" class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 mb-3" style="background: rgba(254,226,226,0.8); color: #dc2626; border: 1px solid rgba(239,68,68,0.2);">
          <div class="flex items-center gap-2 text-xs font-bold">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            Maintenance required
          </div>
          <button
            @click="fleetStore.serviceTruck(truck.id)"
            :disabled="gameStore.company.cash < serviceEstimate(truck)"
            class="flex-shrink-0 rounded-md px-2.5 py-1 text-[10px] font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style="background: #dc2626;"
          >Service ~${{ serviceEstimate(truck) }}</button>
        </div>

        <!-- Fuel + Condition bars -->
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

        <!-- Equipment badges + license req -->
        <div class="flex flex-wrap gap-1 mb-3">
          <span class="text-[10px] font-bold rounded-md px-1.5 py-0.5" :style="licenseChipStyle(truck.required_license)">{{ truck.required_license }}</span>
          <span v-if="truck.has_liftgate" class="text-[10px] font-bold rounded-md px-1.5 py-0.5" style="background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5);">LIFTGATE</span>
          <span v-if="truck.has_dock_access" class="text-[10px] font-bold rounded-md px-1.5 py-0.5" style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);">DOCK-HIGH</span>
          <span class="text-[10px] font-semibold rounded-md px-1.5 py-0.5 ml-auto" style="background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5);">Resale ${{ (truck.resale_value ?? 0).toLocaleString() }}</span>
        </div>

        <!-- Assigned driver pill + actions -->
        <div class="pt-3 flex items-center justify-between gap-2" style="border-top: 1px solid rgba(226,232,240,0.8);">
          <div v-if="assignedDriver(truck.id)" class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#94a3b8" stroke-width="1.75" viewBox="0 0 20 20"><circle cx="10" cy="7" r="4"/><path d="M2 18c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span class="text-xs font-semibold" style="color: #334155;">{{ assignedDriver(truck.id)!.name }}</span>
            <span class="text-[10px] font-bold rounded px-1.5 py-0.5" :style="licenseChipStyle(assignedDriver(truck.id)!.license_class)">{{ assignedDriver(truck.id)!.license_class }}</span>
          </div>
          <span v-else class="text-xs font-medium" style="color: #94a3b8;">No driver assigned</span>

          <!-- Sell button — only for idle trucks -->
          <button
            v-if="truck.status === 'Idle'"
            @click="confirmSell(truck.id)"
            class="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-all active:scale-95"
            style="background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
          >Sell</button>
          <button
            v-else-if="truck.status === 'EN_ROUTE' || truck.status === 'LOADING'"
            @click="fleetStore.unstickTruck(truck.id)"
            class="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-all active:scale-95"
            style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(251,191,36,0.4);"
          >Unstick</button>
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
            <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" :style="licenseChipStyle(v.required_license)">{{ v.required_license }}</span>
            <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ (v.max_weight_lbs / 1000).toFixed(0) }}k lbs</span>
            <span class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ v.mpg }} mpg</span>
            <span v-if="v.has_liftgate" class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5);">LIFTGATE</span>
            <span v-if="v.has_dock_access" class="text-[10px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);">DOCK-HIGH</span>
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
    </template>

    <!-- ════════════════════════════════════ ROSTER TAB ════════════════════════════════════ -->
    <template v-else>

      <!-- Empty roster (shouldn't happen, but belt + suspenders) -->
      <div v-if="fleetStore.drivers.length === 0" class="text-center py-8">
        <p class="text-sm font-bold mb-1" style="color: #0f172a;">No drivers yet</p>
        <p class="text-xs" style="color: #94a3b8;">Buy your first vehicle to add yourself as an Owner-Op driver.</p>
      </div>

      <!-- Driver cards -->
      <div
        v-for="driver in fleetStore.drivers"
        :key="driver.id"
        class="rounded-xl p-4"
        style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
      >
        <!-- Name + status -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background: rgba(219,234,254,0.8); border: 1px solid rgba(147,197,253,0.4);">
              <svg class="w-4 h-4" fill="none" stroke="#2563eb" stroke-width="1.75" viewBox="0 0 20 20"><circle cx="10" cy="7" r="4"/><path d="M2 18c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-bold" style="color: #0f172a;">{{ driver.name }}</p>
                <span v-if="driver.is_owner_op" class="text-[9px] font-black rounded px-1 py-0.5" style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);">OWNER-OP</span>
              </div>
              <p class="text-[11px] font-medium" style="color: #94a3b8;">
                {{ driver.daily_wage === 0 ? 'No wage' : `$${driver.daily_wage}/day` }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black rounded-md px-1.5 py-0.5" :style="licenseChipStyle(driver.license_class)">{{ driver.license_class }}</span>
            <span class="text-[10px] font-bold uppercase tracking-widest" :style="driver.status === 'Available' ? 'color: #059669;' : driver.status === 'Driving' ? 'color: #2563eb;' : 'color: #dc2626;'">{{ driver.status }}</span>
          </div>
        </div>

        <!-- HOS bars -->
        <div class="flex gap-3 mb-3">
          <div class="flex-1">
            <div class="flex justify-between text-[10px] font-semibold mb-1" style="color: #94a3b8;">
              <span>Drive HOS</span>
              <span class="tabular-nums" style="color: #64748b;">{{ driver.hos_drive_remaining.toFixed(1) }}h</span>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
              <div class="h-full rounded-full" :style="{ width: `${(driver.hos_drive_remaining / 11) * 100}%`, background: driver.hos_drive_remaining < 3 ? '#ef4444' : '#10b981' }" />
            </div>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-[10px] font-semibold mb-1" style="color: #94a3b8;">
              <span>On-Duty</span>
              <span class="tabular-nums" style="color: #64748b;">{{ driver.hos_onduty_remaining.toFixed(1) }}h</span>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
              <div class="h-full rounded-full" :style="{ width: `${(driver.hos_onduty_remaining / 14) * 100}%`, background: driver.hos_onduty_remaining < 4 ? '#ef4444' : '#f59e0b' }" />
            </div>
          </div>
        </div>

        <!-- Assigned vehicle + controls -->
        <div class="pt-3 flex flex-col gap-2" style="border-top: 1px solid rgba(226,232,240,0.8);">
          <!-- Current assignment -->
          <div class="flex items-center justify-between">
            <div v-if="driver.assigned_truck_id && vehicleForDriver(driver.id)" class="flex items-center gap-1.5">
              <span class="text-lg leading-none">{{ truckEmoji(vehicleForDriver(driver.id)!.truck_type) }}</span>
              <span class="text-xs font-semibold" style="color: #334155;">{{ vehicleForDriver(driver.id)!.name }}</span>
              <button
                v-if="driver.status !== 'Driving'"
                @click="fleetStore.unassignDriver(driver.id)"
                class="text-[9px] font-black rounded px-1.5 py-0.5 transition-all active:scale-95"
                style="background: rgba(241,245,249,0.9); color: #94a3b8; border: 1px solid rgba(226,232,240,0.8);"
              >Unassign</button>
            </div>
            <span v-else class="text-xs font-medium" style="color: #94a3b8;">No vehicle assigned</span>

            <!-- Fire button — only for hired (non owner-op) drivers when not driving -->
            <button
              v-if="!driver.is_owner_op && driver.status !== 'Driving'"
              @click="fleetStore.fireDriver(driver.id)"
              class="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-all active:scale-95"
              style="background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
            >Fire</button>
          </div>

          <!-- Reassign vehicle select — shown when driver is not currently driving -->
          <div v-if="driver.status !== 'Driving' && idleUnassignedTrucksFor(driver).length > 0">
            <label class="text-[10px] font-bold uppercase tracking-widest block mb-1" style="color: #94a3b8;">Assign Vehicle</label>
            <div class="relative">
              <select
                class="w-full text-xs font-semibold rounded-lg appearance-none pr-6 pl-3 py-2 outline-none"
                style="background: white; border: 1px solid rgba(226,232,240,0.8); color: #0f172a;"
                @change="onReassign(driver.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">-- Assign to truck --</option>
                <option v-for="t in idleUnassignedTrucksFor(driver)" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            <!-- Incompatibility hint -->
            <p v-if="incompatibleCount(driver) > 0" class="text-[10px] mt-1" style="color: #94a3b8;">
              {{ incompatibleCount(driver) }} truck{{ incompatibleCount(driver) > 1 ? 's' : '' }} require a higher CDL
            </p>
          </div>
          <!-- No compatible idle trucks message -->
          <p
            v-else-if="driver.status !== 'Driving' && fleetStore.idleTrucks.length > 0 && idleUnassignedTrucksFor(driver).length === 0"
            class="text-[10px]"
            style="color: #94a3b8;"
          >All idle trucks require a higher CDL than {{ driver.license_class }}</p>
        </div>
      </div>

      <!-- Assign-error toast -->
      <div
        v-if="assignError"
        class="rounded-xl px-4 py-3 text-xs font-semibold"
        style="background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
      >{{ assignError }}</div>

      <!-- ── Driver Market ── -->
      <div v-if="fleetStore.driver_pool.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
          <span class="text-[11px] font-bold uppercase tracking-widest px-2" style="color: #94a3b8;">Driver Market</span>
          <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
        </div>

        <div
          v-for="h in fleetStore.driver_pool"
          :key="h.id"
          class="rounded-xl p-3.5 mb-3 last:mb-0 flex items-center justify-between gap-3"
          style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1">
              <p class="text-sm font-bold truncate" style="color: #0f172a;">{{ h.name }}</p>
              <span class="text-[10px] font-bold rounded-md px-1.5 py-0.5 flex-shrink-0" :style="hireableChipStyle(h.class_license)">{{ h.class_license }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[11px] tracking-tighter" style="color: #f59e0b;">{{ skillStars(h.skill_rating) }}</span>
              <span class="text-[11px] font-semibold tabular-nums" style="color: #64748b;">${{ h.daily_wage }}/day</span>
            </div>
          </div>
          <button
            @click="fleetStore.hireDriver(h.id)"
            class="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black text-white transition-all active:scale-95"
            style="background: #059669;"
          >Hire</button>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { useTerminalStore } from '~/stores/useTerminalStore'
import { useDayStore } from '~/stores/useDayStore'
import { VEHICLE_CATALOG } from '~/data/vehicles'
import type { VehicleListing } from '~/data/vehicles'
import type { TransportStatus, LicenseClass, Driver } from '~/types/game'

const fleetStore = useFleetStore()
const gameStore = useGameStore()
const terminalStore = useTerminalStore()
const dayStore = useDayStore()

const activeTab = ref<'Garage' | 'Roster'>('Garage')
const assignError = ref('')

// Seed the hire pool on first open and whenever the Roster tab becomes visible
onMounted(() => {
  if (fleetStore.driver_pool.length === 0) {
    fleetStore.generateDriverPool(gameStore.company.current_day)
  }
})
watch(activeTab, (tab) => {
  if (tab === 'Roster' && fleetStore.driver_pool.length === 0) {
    fleetStore.generateDriverPool(gameStore.company.current_day)
  }
})

// ─── Garage helpers ───────────────────────────────────────────────────────────
const assignedDriver = (truckId: string) => fleetStore.getDriverForTruck(truckId)

function routeForTruck(truckId: string) {
  return dayStore.fleet_routes[truckId] ?? null
}

function routeStopInfo(truckId: string) {
  const route = routeForTruck(truckId)
  if (!route || dayStore.phase !== 'in_progress') return null
  const realStops = route.manifest.filter(s => s.stop_type !== 'terminal_return')
  const total = realStops.length
  const current = Math.min(route.current_stop_index + 1, total)
  const stop = route.manifest[route.current_stop_index]
  return { current, total, customer: stop?.job.customer_name ?? '' }
}

function serviceEstimate(truck: import('~/types/game').Truck): number {
  return Math.max(150, Math.round(truck.odometer * 0.008 + 80))
}

function confirmSell(truckId: string) {
  const truck = fleetStore.getTruckById(truckId)
  if (!truck) return
  if (confirm(`Sell ${truck.name} for $${(truck.resale_value ?? 0).toLocaleString()}?`)) {
    fleetStore.sellVehicle(truckId)
  }
}

// ─── Roster helpers ───────────────────────────────────────────────────────────
const vehicleForDriver = (driverId: string) => {
  const driver = fleetStore.drivers.find(d => d.id === driverId)
  if (!driver?.assigned_truck_id) return null
  return fleetStore.getTruckById(driver.assigned_truck_id) ?? null
}

const LICENSE_RANK: Record<LicenseClass, number> = { CLASS_C: 0, CLASS_B: 1, CLASS_A: 2 }

function idleUnassignedTrucksFor(driver: Driver) {
  const driverRank = LICENSE_RANK[driver.license_class ?? 'CLASS_C']
  return fleetStore.idleTrucks.filter(t =>
    LICENSE_RANK[t.required_license ?? 'CLASS_C'] <= driverRank &&
    (!t.driver_id || t.driver_id === driver.assigned_truck_id)
  )
}

function incompatibleCount(driver: Driver) {
  const driverRank = LICENSE_RANK[driver.license_class ?? 'CLASS_C']
  return fleetStore.idleTrucks.filter(t => LICENSE_RANK[t.required_license ?? 'CLASS_C'] > driverRank).length
}

function onReassign(driverId: string, vehicleId: string) {
  if (!vehicleId) return
  const result = fleetStore.assignDriverToVehicle(driverId, vehicleId)
  if (!result.ok) {
    assignError.value = result.reason ?? 'Cannot assign'
    setTimeout(() => { assignError.value = '' }, 3000)
  }
}

function hireableChipStyle(cls: string): string {
  if (cls === 'CDL-A') return 'background: rgba(237,233,254,0.9); color: #7c3aed; border: 1px solid rgba(196,181,253,0.5);'
  if (cls === 'CDL-B') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  return 'background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
}

function skillStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// ─── Shop ─────────────────────────────────────────────────────────────────────
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

// ─── Shared helpers ───────────────────────────────────────────────────────────
const truckEmoji = (type: string) => {
  if (type === 'Semi' || type === 'Day Cab') return '🚛'
  if (type === 'Flatbed') return '🚚'
  return '🚐'
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

function licenseChipStyle(cls: LicenseClass | undefined | null): string {
  if (cls === 'CLASS_A') return 'background: rgba(237,233,254,0.9); color: #7c3aed; border: 1px solid rgba(196,181,253,0.5);'
  if (cls === 'CLASS_B') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  return 'background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
}

const originName = (id: string) => terminalStore.getById(id)?.city ?? id

const statusLabel = (truckId: string, status: TransportStatus): string => {
  if ((status === 'EN_ROUTE' || status === 'LOADING') && routeForTruck(truckId)) {
    const info = routeStopInfo(truckId)
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
