<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <div>
      <h2 class="text-base font-bold" style="color: #0f172a;">Freight Brokers</h2>
      <p class="text-xs mt-0.5" style="color: #94a3b8;">Clear dock — broker out or assign a carrier</p>
    </div>
    <span
      v-if="totalWaiting > 0"
      class="text-xs font-black rounded-md px-2 py-1"
      style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(251,191,36,0.4);"
    >{{ totalWaiting }} waiting</span>
  </div>

  <div class="modal-body p-4 flex flex-col gap-3" style="overflow-y: auto;">

    <!-- ── Inbound: equipment locked ─────────────────────────────────────── -->
    <template v-if="networkStore.dock_incompatible.length > 0">
      <p class="text-[10px] font-black uppercase tracking-widest px-0.5" style="color: #7c3aed;">Inbound — No Equipment</p>
      <div
        v-for="item in networkStore.dock_incompatible"
        :key="item.id"
        class="rounded-xl px-4 py-3 flex items-center gap-3"
        style="background: rgba(237,233,254,0.5); border: 1px solid rgba(196,181,253,0.5);"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold truncate" style="color: #0f172a;">{{ item.job.customer_name }}</p>
          <p class="text-[10px] mt-0.5" style="color: #7c3aed;">{{ equipmentNeeded(item.job) }}</p>
        </div>
        <div class="flex-shrink-0 text-right mr-2">
          <p class="text-sm font-black tabular-nums" style="color: #059669;">${{ Math.ceil(item.job.payout * 0.65).toLocaleString() }}</p>
          <p class="text-[10px]" style="color: #94a3b8;">65% payout</p>
        </div>
        <button
          @click="doBrokerInbound(item.id)"
          class="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition-all active:scale-95"
          style="background: #7c3aed; color: white;"
        >Pass</button>
      </div>
      <div class="h-px" style="background: rgba(226,232,240,0.8);"></div>
    </template>

    <!-- ── Outbound: needs carrier ────────────────────────────────────────── -->
    <template v-if="networkStore.outbound_pending.length > 0">
      <p class="text-[10px] font-black uppercase tracking-widest px-0.5" style="color: #d97706;">Outbound — Needs Carrier</p>

      <!-- Volume bar -->
      <div class="rounded-xl px-4 py-2.5 flex items-center gap-3" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <div class="flex-1">
          <div class="h-2 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div
              class="h-full rounded-full"
              :style="{ width: `${Math.min(100, dockCapPct * 100)}%`, background: dockCapPct > 0.85 ? '#ef4444' : dockCapPct > 0.6 ? '#f59e0b' : '#3b82f6' }"
            />
          </div>
        </div>
        <span class="text-[10px] font-black tabular-nums flex-shrink-0" :style="dockCapPct > 0.85 ? 'color:#dc2626;' : 'color:#64748b;'">
          {{ Math.round(outboundVolume) }}/{{ OUTBOUND_DOCK_CAP }} ft³
        </span>
      </div>

      <!-- Per-item compact cards -->
      <div
        v-for="freight in networkStore.outbound_pending"
        :key="freight.id"
        class="rounded-xl overflow-hidden"
        :style="daysOnDock(freight) > 2
          ? 'background: rgba(254,243,199,0.6); border: 1px solid rgba(251,191,36,0.5);'
          : 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'"
      >
        <!-- Top row: name + dest + payout -->
        <div class="flex items-start justify-between px-4 pt-3 pb-2 gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <p class="text-sm font-bold truncate" style="color: #0f172a;">{{ freight.job.customer_name }}</p>
              <span
                v-if="daysOnDock(freight) > 1"
                class="text-[9px] font-black rounded px-1 py-0.5 flex-shrink-0"
                :style="daysOnDock(freight) > 2 ? 'background: rgba(254,226,226,0.9); color: #dc2626;' : 'background: rgba(254,243,199,0.9); color: #d97706;'"
              >{{ daysOnDock(freight) }}d</span>
            </div>
            <p class="text-[10px] mt-0.5 truncate" style="color: #64748b;">
              → {{ freight.dest?.label ?? 'Out of area' }} · {{ freight.dest?.distance_miles ?? '?' }}mi
            </p>
          </div>
          <p class="text-sm font-black tabular-nums flex-shrink-0" style="color: #059669;">${{ freight.job.payout.toLocaleString() }}</p>
        </div>

        <!-- Action buttons: always visible -->
        <div class="flex gap-2 px-4 pb-3">
          <!-- Broker Out: primary action, fee shown inline -->
          <button
            @click="doBrokerOut(freight.id)"
            class="flex-1 rounded-lg py-2 text-[11px] font-black transition-all active:scale-95"
            style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(251,191,36,0.5);"
          >
            Broker Out
            <span class="font-medium opacity-75">({{ brokerFeeLabel(freight) }} fee)</span>
          </button>
          <!-- Rent Carrier: secondary, expands in place -->
          <button
            @click="expandedCarrier = expandedCarrier === freight.id ? null : freight.id"
            class="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition-all active:scale-95"
            :style="expandedCarrier === freight.id
              ? 'background: #2563eb; color: white;'
              : 'background: rgba(219,234,254,0.9); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'"
          >{{ expandedCarrier === freight.id ? '▲ Close' : 'Find Carrier' }}</button>
        </div>

        <!-- Carrier picker (expands inline) -->
        <div
          v-if="expandedCarrier === freight.id"
          class="border-t px-4 pb-4 flex flex-col gap-2"
          style="border-color: rgba(226,232,240,0.8); background: rgba(241,245,249,0.5);"
        >
          <p class="text-[10px] font-bold uppercase tracking-widest pt-3" style="color: #94a3b8;">Available Tonight</p>
          <div v-if="carriersFor(freight).length === 0" class="text-[11px] py-1" style="color: #94a3b8;">
            No carriers on this lane today. Broker out or try tomorrow.
          </div>
          <div
            v-for="opt in carriersFor(freight)"
            :key="opt.id"
            class="rounded-lg px-3 py-2.5 flex items-center justify-between"
            style="background: white; border: 1px solid rgba(226,232,240,0.8);"
          >
            <div class="flex-1 min-w-0 mr-3">
              <p class="text-[11px] font-bold truncate" style="color: #0f172a;">{{ opt.carrier }}</p>
              <p class="text-[10px] mt-0.5" style="color: #94a3b8;">departs tonight</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-[11px] font-black tabular-nums" style="color: #dc2626;">–${{ carrierCost(freight, opt).toLocaleString() }}</p>
              <button
                @click="doRentCarrier(freight.id, opt.id)"
                class="mt-1 rounded-md px-2.5 py-1 text-[10px] font-black text-white transition-all active:scale-95"
                style="background: #2563eb;"
              >Book</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-if="totalWaiting === 0" class="text-center py-12">
      <div class="text-4xl mb-3 opacity-30">📦</div>
      <p class="text-sm font-semibold mb-1" style="color: #0f172a;">Dock is clear</p>
      <p class="text-xs leading-relaxed max-w-[220px] mx-auto" style="color: #94a3b8;">
        Completed pickups and equipment-locked inbound loads appear here.
      </p>
    </div>

    <div class="h-1"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useGameStore } from '~/stores/useGameStore'
import { checkJobCompatibility } from '~/composables/useEquipmentCheck'
import { useFleetStore } from '~/stores/useFleetStore'
import type { StagedOutbound, LineHaulOption, Job } from '~/types/game'

const networkStore = useNetworkStore()
const gameStore = useGameStore()
const fleetStore = useFleetStore()

const OUTBOUND_DOCK_CAP = 2000
const expandedCarrier = ref<string | null>(null)

const totalWaiting = computed(() =>
  networkStore.outbound_pending.length + networkStore.dock_incompatible.length
)

const outboundVolume = computed(() =>
  networkStore.outbound_pending.reduce((sum, f) => sum + (f.job.volume_ft3 ?? 0), 0)
)
const dockCapPct = computed(() => outboundVolume.value / OUTBOUND_DOCK_CAP)

const daysOnDock = (freight: StagedOutbound) =>
  gameStore.company.current_day - freight.day_staged

function equipmentNeeded(job: Job): string {
  const truck = fleetStore.trucks[0]
  if (!truck) return 'Needs special equipment'
  const result = checkJobCompatibility(job, truck)
  return result.reason ?? 'Wrong equipment'
}

function doBrokerInbound(dockItemId: string) {
  networkStore.brokerInboundFreight(dockItemId)
}

const carriersFor = (freight: StagedOutbound): LineHaulOption[] =>
  networkStore.market_for_dest(freight.dest?.terminal_id ?? null, freight.dest?.type ?? 'out_of_network')

const carrierCost = (freight: StagedOutbound, opt: LineHaulOption): number =>
  Math.ceil(Math.max(opt.flat_min, freight.job.weight_lbs * opt.rate_per_lb + freight.job.volume_ft3 * opt.rate_per_ft3))

const brokerFeeLabel = (freight: StagedOutbound): string =>
  freight.dest?.type === 'out_of_network' ? '15–20%' : '20–25%'

function doRentCarrier(outboundId: string, optionId: string) {
  networkStore.rentLineHaulCapacity(outboundId, optionId)
  expandedCarrier.value = null
}

function doBrokerOut(outboundId: string) {
  networkStore.sellToBroker(outboundId)
}
</script>
