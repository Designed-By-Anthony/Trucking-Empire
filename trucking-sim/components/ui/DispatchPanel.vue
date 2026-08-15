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

      <!-- ════════════════ OUTBOUND DOCK ════════════════ -->
      <template v-if="networkStore.outbound_pending.length > 0">
        <div class="flex items-center gap-2 mt-1">
          <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
          <span class="text-[11px] font-bold uppercase tracking-widest px-2" style="color: #94a3b8;">Outbound Dock</span>
          <div class="h-px flex-1" style="background: rgba(226,232,240,0.8);"></div>
        </div>

        <!-- Dock capacity bar -->
        <div class="rounded-xl px-4 py-3" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold uppercase tracking-wider" style="color: #94a3b8;">Dock Volume</span>
            <span class="text-[11px] font-black tabular-nums" :style="dockCapPct > 0.85 ? 'color: #dc2626;' : dockCapPct > 0.6 ? 'color: #d97706;' : 'color: #64748b;'">
              {{ Math.round(outboundVolume) }} / {{ DOCK_CAPACITY_FT3 }} ft³
            </span>
          </div>
          <div class="h-2 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full transition-all duration-500"
              :style="{ width: `${Math.min(100, dockCapPct * 100)}%`, background: dockCapPct > 0.85 ? '#ef4444' : dockCapPct > 0.6 ? '#f59e0b' : '#3b82f6' }" />
          </div>
        </div>

        <!-- Per-item outbound cards -->
        <div
          v-for="freight in networkStore.outbound_pending"
          :key="freight.id"
          class="rounded-xl overflow-hidden"
          :style="daysOnDock(freight) > 2
            ? 'background: rgba(254,243,199,0.6); border: 1px solid rgba(251,191,36,0.5);'
            : 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'"
        >
          <!-- Freight info row -->
          <div class="flex items-start justify-between px-4 pt-3 pb-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold truncate" style="color: #0f172a;">{{ freight.job.customer_name }}</p>
              <p class="text-[11px] font-medium mt-0.5 truncate" style="color: #64748b;">→ {{ freight.dest.label }}</p>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-[10px] font-semibold rounded px-1.5 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ formatWeight(freight.job.weight_lbs) }}</span>
                <span class="text-[10px] font-semibold rounded px-1.5 py-0.5" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);">{{ freight.job.volume_ft3 }} ft³</span>
                <span v-if="daysOnDock(freight) > 1" class="text-[10px] font-bold rounded px-1.5 py-0.5" :style="daysOnDock(freight) > 2 ? 'background: rgba(254,226,226,0.8); color: #dc2626;' : 'background: rgba(254,243,199,0.8); color: #d97706;'">
                  {{ daysOnDock(freight) }}d on dock
                </span>
              </div>
            </div>
            <p class="text-sm font-black tabular-nums ml-3 flex-shrink-0" style="color: #059669;">${{ freight.job.payout.toLocaleString() }}</p>
          </div>

          <!-- Action buttons -->
          <div class="px-4 pb-3 flex gap-2">
            <button
              v-if="expandedCarrier !== freight.id"
              @click="expandedCarrier = freight.id"
              class="flex-1 rounded-lg py-1.5 text-[11px] font-black transition-all active:scale-95"
              style="background: rgba(219,234,254,0.9); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);"
            >Rent Carrier</button>
            <button
              v-else
              @click="expandedCarrier = null"
              class="flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all active:scale-95"
              style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);"
            >▲ Close</button>
            <button
              @click="doBrokerOut(freight.id)"
              class="flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all active:scale-95"
              style="background: rgba(241,245,249,0.9); color: #94a3b8; border: 1px solid rgba(226,232,240,0.8);"
            >Broker Out (~{{ brokerFeeLabel(freight) }})</button>
          </div>

          <!-- Carrier picker -->
          <div v-if="expandedCarrier === freight.id" class="border-t px-4 pb-4 flex flex-col gap-2" style="border-color: rgba(226,232,240,0.8); background: rgba(241,245,249,0.5);">
            <p class="text-[10px] font-bold uppercase tracking-widest pt-3" style="color: #94a3b8;">Available Carriers</p>
            <div v-if="carriersFor(freight).length === 0" class="text-[11px]" style="color: #94a3b8;">No carriers serving this lane today</div>
            <div
              v-for="opt in carriersFor(freight)"
              :key="opt.id"
              class="rounded-lg px-3 py-2.5 flex items-center justify-between"
              style="background: white; border: 1px solid rgba(226,232,240,0.8);"
            >
              <div>
                <p class="text-[11px] font-bold" style="color: #0f172a;">{{ opt.carrier }}</p>
                <p class="text-[10px]" style="color: #94a3b8;">→ {{ opt.dest.label }} · departs today</p>
              </div>
              <div class="text-right">
                <p class="text-[11px] font-black tabular-nums" style="color: #dc2626;">–${{ carrierCost(freight, opt).toLocaleString() }}</p>
                <button
                  @click="doRentCarrier(freight.id, opt.id)"
                  class="mt-1 rounded-md px-2 py-1 text-[10px] font-black text-white transition-all active:scale-95"
                  style="background: #2563eb;"
                >Book</button>
              </div>
            </div>
          </div>
        </div>
      </template>

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
import type { Contract, StagedOutbound, LineHaulOption } from '~/types/game'

const contractStore = useContractStore()
const fleetStore = useFleetStore()
const terminalStore = useTerminalStore()
const gameStore = useGameStore()
const networkStore = useNetworkStore()
const { getRoute } = useRouting()
const { $pushSubscribe } = useNuxtApp()

const DOCK_CAPACITY_FT3 = 2000

const assigningId = ref<string | null>(null)
const selectedTruck = ref('')
const selectedDriver = ref('')
const expandedCarrier = ref<string | null>(null)

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

// ─── Outbound dock helpers ──────────────────────────────────────────────────
const outboundVolume = computed(() =>
  networkStore.outbound_pending.reduce((sum, f) => sum + (f.job.volume_ft3 ?? 0), 0)
)
const dockCapPct = computed(() => outboundVolume.value / DOCK_CAPACITY_FT3)

const daysOnDock = (freight: StagedOutbound) =>
  gameStore.company.current_day - freight.day_staged

const carriersFor = (freight: StagedOutbound): LineHaulOption[] =>
  networkStore.market_for_dest(freight.dest.terminal_id, freight.dest.type)

const carrierCost = (freight: StagedOutbound, opt: LineHaulOption): number =>
  Math.ceil(Math.max(opt.flat_min, freight.job.weight_lbs * opt.rate_per_lb + freight.job.volume_ft3 * opt.rate_per_ft3))

const brokerFeeLabel = (freight: StagedOutbound): string => {
  const pct = freight.dest.type === 'out_of_network' ? '15–20%' : '20–25%'
  return pct + ' fee'
}

function doRentCarrier(outboundId: string, optionId: string) {
  networkStore.rentLineHaulCapacity(outboundId, optionId)
  expandedCarrier.value = null
}

function doBrokerOut(outboundId: string) {
  networkStore.sellToBroker(outboundId)
}
</script>
