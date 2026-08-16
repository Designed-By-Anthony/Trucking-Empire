<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <div class="flex items-center gap-2">
      <h2 class="text-base font-bold" style="color: #0f172a;">Dispatch</h2>
      <span
        v-if="contractStore.available.length > 0"
        class="text-xs font-semibold rounded-md px-2 py-0.5"
        style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);"
      >{{ contractStore.available.length }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span v-if="networkStore.outbound_pending.length" class="text-[10px] font-black rounded-full px-2 py-0.5" style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(251,191,36,0.4);">
        {{ networkStore.outbound_pending.length }} outbound
      </span>
      <span class="text-xs font-medium" style="color: #94a3b8;">Day {{ gameStore.company.current_day + 1 }}</span>
    </div>
  </div>

  <!-- Single scrollable body -->
  <div class="modal-body p-4 flex flex-col gap-3" style="overflow-y: auto;">

    <!-- No vehicles -->
    <div v-if="fleetStore.trucks.length === 0" class="text-center py-8">
      <div class="text-4xl mb-3 opacity-30">🚐</div>
      <p class="text-sm font-semibold mb-1" style="color: #0f172a;">No vehicles</p>
      <p class="text-xs leading-relaxed" style="color: #94a3b8;">Open the Fleet tab to buy your first vehicle</p>
    </div>

    <template v-else>
      <!-- Empty state: no jobs AND no outbound -->
      <div v-if="contractStore.available.length === 0 && networkStore.outbound_pending.length === 0" class="text-center py-8">
        <div class="text-4xl mb-3 opacity-30">📦</div>
        <p class="text-sm font-semibold mb-1" style="color: #0f172a;">No jobs right now</p>
        <p class="text-xs leading-relaxed" style="color: #94a3b8;">New packages appear each day — check back soon</p>
      </div>

      <!-- ── Hub-to-Hub Contracts ── -->
      <div
        v-for="contract in contractStore.available"
        :key="contract.id"
        class="rounded-xl p-4 transition-all"
        :style="isUrgent(contract.delivery_deadline)
          ? 'background: rgba(254,242,242,0.9); border: 1px solid rgba(239,68,68,0.3);'
          : 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'"
      >
        <!-- Route + payout -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold tracking-tight leading-snug" style="color: #0f172a;">
              {{ originName(contract.origin_hub_id) }}
              <span style="color: #cbd5e1;" class="font-normal mx-1">→</span>
              {{ destName(contract.destination_hub_id) }}
            </p>
            <div class="flex items-center flex-wrap gap-1.5 mt-2">
              <span class="text-[11px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ contract.distance_miles }} mi</span>
              <span class="text-[11px] font-semibold rounded-md px-2 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ formatWeight(contract.weight_lbs) }}</span>
              <span class="text-[11px] font-bold rounded-md px-2 py-0.5"
                :style="isUrgent(contract.delivery_deadline)
                  ? 'background: rgba(254,226,226,0.8); color: #dc2626; border: 1px solid rgba(239,68,68,0.3);'
                  : 'background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);'"
              >{{ isUrgent(contract.delivery_deadline) ? '⚡ ' : '' }}{{ hoursUntil(contract.delivery_deadline) }}h</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-4">
            <p class="text-base font-black tabular-nums" style="color: #059669; letter-spacing: -0.03em;">${{ contract.payout.toLocaleString() }}</p>
            <p class="text-[11px] tabular-nums" style="color: #94a3b8;">${{ (contract.payout / Math.max(1, contract.distance_miles)).toFixed(2) }}/mi</p>
          </div>
        </div>

        <!-- Assignment expanded -->
        <div v-if="assigningId === contract.id" class="flex flex-col gap-2 pt-1">
          <select v-model="selectedTruck" class="w-full text-sm font-medium rounded-lg px-3 py-2.5 outline-none" style="background: white; border: 1px solid #e2e8f0; color: #0f172a; -webkit-appearance: none;">
            <option value="">Select vehicle…</option>
            <option v-for="truck in eligibleTrucks(contract.weight_lbs)" :key="truck.id" :value="truck.id">{{ truck.name }} · {{ truck.fuel_level.toFixed(0) }}g fuel</option>
          </select>
          <select v-if="selectedTruck" v-model="selectedDriver" class="w-full text-sm font-medium rounded-lg px-3 py-2.5 outline-none" style="background: white; border: 1px solid #e2e8f0; color: #0f172a; -webkit-appearance: none;">
            <option value="">Select driver…</option>
            <option v-for="driver in availableDriversForTruck(selectedTruck)" :key="driver.id" :value="driver.id">{{ driver.name }} · {{ driver.hos_drive_remaining.toFixed(0) }}h HOS</option>
          </select>
          <div class="flex gap-2 mt-1">
            <button @click="confirmDispatch(contract)" :disabled="!selectedTruck || !selectedDriver" class="flex-1 text-sm font-bold text-white rounded-lg py-2.5 transition-all active:scale-95 disabled:opacity-40" style="background: #2563eb;">Dispatch →</button>
            <button @click="assigningId = null; selectedTruck = ''; selectedDriver = ''" class="text-sm font-semibold rounded-lg px-4 py-2.5 transition-all active:scale-95" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">Cancel</button>
          </div>
        </div>
        <button v-else @click="assigningId = contract.id; selectedTruck = ''; selectedDriver = ''" class="w-full text-sm font-bold text-white rounded-lg py-2.5 mt-1 transition-all active:scale-95" style="background: #2563eb;">Assign Vehicle</button>
      </div>

      <!-- Outbound freight moved to Brokers tab -->
      <div
        v-if="networkStore.outbound_pending.length > 0"
        class="rounded-xl px-4 py-3 flex items-center gap-3"
        style="background: rgba(254,243,199,0.6); border: 1px solid rgba(251,191,36,0.4);"
      >
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
        </svg>
        <div class="flex-1">
          <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #d97706;">Outbound Staged</p>
          <p class="text-xs font-semibold mt-0.5" style="color: #92400e;">{{ networkStore.outbound_pending.length }} loads need carrier — open Brokers tab to ship</p>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContractStore } from '~/stores/useContractStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useTerminalStore } from '~/stores/useTerminalStore'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useRouting } from '~/composables/useRouting'
import type { Contract } from '~/types/game'

const contractStore = useContractStore()
const fleetStore = useFleetStore()
const terminalStore = useTerminalStore()
const gameStore = useGameStore()
const networkStore = useNetworkStore()
const { getRoute } = useRouting()
const { $pushSubscribe } = useNuxtApp()

const assigningId = ref<string | null>(null)
const selectedTruck = ref('')
const selectedDriver = ref('')

// ─── Contract helpers ───────────────────────────────────────────────────────
const originName = (id: string) => terminalStore.getById(id)?.city ?? id
const destName = (id: string) => terminalStore.getById(id)?.city ?? id
const hoursUntil = (tick: number) => Math.max(0, Math.round(tick - gameStore.company.date_tick))
const isUrgent = (tick: number) => hoursUntil(tick) < 6
const formatWeight = (lbs: number) => lbs >= 1000 ? `${(lbs / 1000).toFixed(1)}k lbs` : `${lbs} lbs`

const eligibleTrucks = (weightLbs: number) =>
  fleetStore.idleTrucks.filter(t => t.max_weight_lbs >= weightLbs)

const availableDriversForTruck = (truckId: string) => {
  const truck = fleetStore.getTruckById(truckId)
  if (truck?.driver_id) {
    const d = fleetStore.getDriverById(truck.driver_id)
    return d && d.status === 'Available' ? [d] : []
  }
  return fleetStore.availableDrivers
}

const confirmDispatch = async (contract: Contract) => {
  if (!selectedTruck.value || !selectedDriver.value) return
  const origin = terminalStore.getById(contract.origin_hub_id)
  const dest = terminalStore.getById(contract.destination_hub_id)
  if (!origin || !dest) return
  try {
    const route = await getRoute(origin.lat, origin.lng, dest.lat, dest.lng, 'ground')
    fleetStore.assignDriverToTruck(selectedDriver.value, selectedTruck.value)
    contractStore.assignContract(contract.id, selectedTruck.value)
    contractStore.markInTransit(contract.id)
    fleetStore.dispatchTruck(selectedTruck.value, contract.destination_hub_id, contract.weight_lbs, route.geometry, route.distance_miles)
  } catch {
    fleetStore.assignDriverToTruck(selectedDriver.value, selectedTruck.value)
    contractStore.assignContract(contract.id, selectedTruck.value)
    contractStore.markInTransit(contract.id)
    fleetStore.dispatchTruck(selectedTruck.value, contract.destination_hub_id, contract.weight_lbs, [], contract.distance_miles)
  }
  assigningId.value = null
  selectedTruck.value = ''
  selectedDriver.value = ''
  if (contractStore.active.length === 1 && typeof $pushSubscribe === 'function') {
    $pushSubscribe()
  }
}

</script>
