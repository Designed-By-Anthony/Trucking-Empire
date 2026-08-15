<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <div>
      <h2 class="text-base font-bold" style="color: #0f172a;">Brand Contracts</h2>
      <p class="text-[11px] font-medium mt-0.5" style="color: #94a3b8;">Long-term freight agreements · 5-day rolling SLA</p>
    </div>
    <div v-if="brandStore.activeContracts.length" class="flex items-center gap-1.5 rounded-full px-2.5 py-1" style="background: rgba(209,250,229,0.8); border: 1px solid rgba(134,239,172,0.5);">
      <span class="w-1.5 h-1.5 rounded-full" style="background: #059669;"></span>
      <span class="text-[10px] font-black" style="color: #059669;">{{ brandStore.activeContracts.length }} ACTIVE</span>
    </div>
  </div>

  <div class="modal-body p-4 flex flex-col gap-4" style="overflow-y: auto;">

    <div
      v-for="c in brandStore.contracts"
      :key="c.id"
      class="rounded-xl overflow-hidden"
      :style="c.active
        ? 'background: rgba(248,250,252,0.9); border: 1px solid rgba(37,99,235,0.25);'
        : 'background: rgba(248,250,252,0.5); border: 1px solid rgba(226,232,240,0.8);'"
    >
      <!-- Brand header row -->
      <div class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" :style="brandIconStyle(c.tier)">
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3h18M3 7h18M3 11h18M3 15h18M3 19h18" v-if="c.tier === 'local'"/>
              <path d="M21 7l-9-4-9 4m18 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7m18 0l-9 4m-9-4l9 4" v-else-if="c.tier === 'regional'"/>
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" v-else/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-bold tracking-tight" style="color: #0f172a;">{{ c.brand_name }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" :style="tierChipStyle(c.tier)">{{ c.tier }}</span>
              <span class="text-[11px] font-medium" style="color: #94a3b8;">${{ c.weekly_retainer.toLocaleString() }} SLA bonus / 5 days</span>
            </div>
          </div>
        </div>
        <button
          v-if="!c.active"
          @click="brandStore.activateContract(c.id)"
          class="rounded-lg px-3 py-1.5 text-[11px] font-black text-white transition-all active:scale-95"
          style="background: #2563eb;"
        >Activate</button>
        <button
          v-else
          @click="brandStore.deactivateContract(c.id)"
          class="rounded-lg px-3 py-1.5 text-[11px] font-black transition-all active:scale-95"
          style="background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
        >Cancel</button>
      </div>

      <!-- SLA progress (only when active) -->
      <div v-if="c.active" class="px-4 pb-4">
        <div class="rounded-lg p-3" style="background: rgba(241,245,249,0.8); border: 1px solid rgba(226,232,240,0.8);">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider" style="color: #64748b;">Weekly Volume</span>
            <span class="text-[11px] font-black tabular-nums" :style="c.weekly_volume_delivered >= c.weekly_volume_target ? 'color: #059669;' : 'color: #0f172a;'">
              {{ c.weekly_volume_delivered }} / {{ c.weekly_volume_target }} pkgs
            </span>
          </div>
          <div class="h-2 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: `${Math.min(100, (c.weekly_volume_delivered / c.weekly_volume_target) * 100)}%`,
                background: c.weekly_volume_delivered >= c.weekly_volume_target ? '#059669' : '#2563eb'
              }"
            />
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[10px]" style="color: #94a3b8;">
              Day {{ currentDayInWindow(c) }} of 5
            </span>
            <span v-if="c.weekly_volume_delivered >= c.weekly_volume_target" class="text-[10px] font-bold" style="color: #059669;">
              ✓ SLA met — bonus pays at day {{ c.week_start_day + 5 }}
            </span>
            <span v-else class="text-[10px]" style="color: #94a3b8;">
              {{ c.weekly_volume_target - c.weekly_volume_delivered }} pkgs to hit SLA
            </span>
          </div>
        </div>
      </div>

      <!-- Inactive description -->
      <div v-else class="px-4 pb-4">
        <p class="text-[11px] leading-relaxed" style="color: #94a3b8;">
          Deliver {{ c.weekly_volume_target }} packages per 5-day window to earn a ${{ c.weekly_retainer.toLocaleString() }} SLA bonus.
          {{ tierDesc(c.tier) }}
        </p>
      </div>
    </div>

    <!-- Empty state if somehow no contracts -->
    <div v-if="!brandStore.contracts.length" class="text-center py-8">
      <p class="text-sm font-bold mb-1" style="color: #0f172a;">No contracts available</p>
      <p class="text-xs" style="color: #94a3b8;">Contracts unlock as you expand operations.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useBrandContractStore } from '~/stores/useBrandContractStore'
import { useGameStore } from '~/stores/useGameStore'
import type { BrandContract } from '~/types/game'

const brandStore = useBrandContractStore()
const gameStore = useGameStore()

function currentDayInWindow(c: BrandContract): number {
  const elapsed = gameStore.company.current_day - c.week_start_day
  return Math.min(5, Math.max(1, elapsed + 1))
}

function brandIconStyle(tier: string): string {
  if (tier === 'national') return 'background: rgba(237,233,254,0.8); color: #7c3aed; border: 1px solid rgba(196,181,253,0.4);'
  if (tier === 'regional') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.4);'
  return 'background: rgba(209,250,229,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.4);'
}

function tierChipStyle(tier: string): string {
  if (tier === 'national') return 'background: rgba(237,233,254,0.9); color: #7c3aed;'
  if (tier === 'regional') return 'background: rgba(219,234,254,0.8); color: #2563eb;'
  return 'background: rgba(209,250,229,0.8); color: #059669;'
}

function tierDesc(tier: string): string {
  if (tier === 'national') return 'National-tier freight. High volume requirement, maximum payout.'
  if (tier === 'regional') return 'Regional distribution. Mid-tier volume and bonus.'
  return 'Local delivery runs across Utica. Achievable from day one.'
}
</script>
