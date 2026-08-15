<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <h2 class="text-base font-bold" style="color: #0f172a;">Financials</h2>
    <span class="text-xs font-medium" style="color: #94a3b8;">{{ gameStore.formattedTime }}</span>
  </div>

  <div class="modal-body p-4 flex flex-col gap-4">

    <!-- Cash hero -->
    <div
      class="rounded-xl p-5 text-center"
      :style="gameStore.company.cash >= 0
        ? 'background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);'
        : 'background: rgba(254,242,242,0.9); border: 1px solid rgba(252,165,165,0.5);'"
    >
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" :style="{ color: gameStore.company.cash >= 0 ? '#059669' : '#dc2626' }">Cash Balance</p>
      <p
        class="text-3xl font-black tabular-nums"
        style="letter-spacing: -0.04em;"
        :style="{ color: gameStore.company.cash >= 0 ? '#059669' : '#dc2626' }"
      >{{ gameStore.formattedCash }}</p>
    </div>

    <!-- Stats 2×2 grid -->
    <div class="grid grid-cols-2 gap-2.5">
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Revenue</p>
        <p class="text-sm font-black tabular-nums" style="color: #2563eb; letter-spacing: -0.02em;">{{ fmt(gameStore.company.total_revenue) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Expenses</p>
        <p class="text-sm font-black tabular-nums" style="color: #dc2626; letter-spacing: -0.02em;">{{ fmt(gameStore.company.total_expenses) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Net P&L</p>
        <p class="text-sm font-black tabular-nums" :style="{ color: gameStore.netProfit >= 0 ? '#059669' : '#dc2626', letterSpacing: '-0.02em' }">{{ fmt(gameStore.netProfit) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Reputation</p>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full" :style="{ width: `${gameStore.company.reputation}%`, background: '#f59e0b' }" />
          </div>
          <span class="text-xs font-black tabular-nums" style="color: #d97706;">{{ gameStore.company.reputation }}</span>
        </div>
      </div>
    </div>

    <!-- Expense breakdown -->
    <div v-if="Object.keys(expenseBreakdown).length > 0">
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Expenses</p>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(226,232,240,0.8);">
        <div
          v-for="(total, category) in expenseBreakdown"
          :key="category"
          class="flex items-center justify-between px-4 py-3"
          style="background: rgba(248,250,252,0.9);"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-base leading-none">{{ categoryEmoji(category) }}</span>
            <span class="text-sm font-semibold capitalize" style="color: #334155;">{{ category }}</span>
          </div>
          <span class="text-sm font-bold tabular-nums" style="color: #dc2626;">−{{ fmt(total) }}</span>
        </div>
      </div>
    </div>

    <!-- Recent deliveries -->
    <div v-if="gameStore.recentRevenue.length > 0">
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Recent Deliveries</p>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(226,232,240,0.8);">
        <div
          v-for="entry in gameStore.recentRevenue.slice().reverse().slice(0, 8)"
          :key="entry.tick"
          class="flex items-center justify-between px-4 py-3"
          style="background: rgba(248,250,252,0.9);"
        >
          <span class="text-xs font-medium tabular-nums" style="color: #94a3b8;">Hour {{ Math.floor(entry.tick) }}</span>
          <span class="text-sm font-bold tabular-nums" style="color: #059669;">+{{ fmt(entry.amount) }}</span>
        </div>
      </div>
    </div>

    <div v-if="gameStore.recentRevenue.length === 0" class="text-center py-6">
      <div class="text-3xl mb-2 opacity-20">📊</div>
      <p class="text-xs" style="color: #94a3b8;">Complete a delivery to see revenue</p>
    </div>

    <!-- Dev reset — wipes all state and restarts onboarding -->
    <div class="mt-2 pt-4" style="border-top: 1px solid rgba(226,232,240,0.6);">
      <button
        @click="gameStore.resetGameToInitialState()"
        class="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
        style="background: rgba(254,242,242,0.8); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
      >
        ⚙ Reset to Day 1 (Dev)
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/useGameStore'

const gameStore = useGameStore()

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const categoryEmoji = (cat: string) =>
  ({ fuel: '⛽', wages: '👤', maintenance: '🔧', overhead: '🏢', vehicle: '🚐' }[cat] ?? '💸')

const expenseBreakdown = computed(() => {
  const b: Record<string, number> = {}
  gameStore.recentExpenses.forEach(e => { b[e.category] = (b[e.category] ?? 0) + e.amount })
  return b
})
</script>
