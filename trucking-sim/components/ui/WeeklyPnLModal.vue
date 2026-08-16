<template>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-5 py-4 flex-shrink-0"
    style="border-bottom: 1px solid rgba(226,232,240,0.8);"
  >
    <div>
      <h2 class="text-base font-bold" style="color: #0f172a;">Week {{ currentWeekNumber }} P&L Report</h2>
      <p class="text-xs mt-0.5" style="color: #94a3b8;">5-Day Performance Summary</p>
    </div>
    <div
      class="text-sm font-black rounded-lg px-3 py-1.5"
      :style="weekGradeBadgeStyle"
    >{{ weekGrade }}</div>
  </div>

  <!-- Scrollable body -->
  <div class="modal-body flex flex-col gap-4 px-4 py-4">

    <!-- Weekly net hero -->
    <div
      class="rounded-xl px-5 py-4"
      :style="weekNetProfit >= 0
        ? 'background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);'
        : 'background: rgba(254,242,242,0.9); border: 1px solid rgba(239,68,68,0.3);'"
    >
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" :style="weekNetProfit >= 0 ? 'color:#059669;' : 'color:#dc2626;'">
        Week {{ currentWeekNumber }} Net Profit
      </p>
      <p
        class="text-3xl font-black tabular-nums leading-none"
        :style="weekNetProfit >= 0 ? 'color:#059669; letter-spacing:-0.04em;' : 'color:#dc2626; letter-spacing:-0.04em;'"
      >
        {{ weekNetProfit >= 0 ? '+' : '' }}${{ Math.abs(weekNetProfit).toLocaleString() }}
      </p>
      <div class="mt-2.5 flex items-center gap-4">
        <div>
          <span class="text-[11px]" style="color: #64748b;">Gross Revenue </span>
          <span class="text-[11px] font-semibold" style="color: #059669;">+${{ weekRevenue.toLocaleString() }}</span>
        </div>
        <div>
          <span class="text-[11px]" style="color: #64748b;">Total Costs </span>
          <span class="text-[11px] font-semibold" style="color: #dc2626;">−${{ weekCosts.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Day-by-day table -->
    <div
      class="rounded-xl overflow-hidden"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <div
        class="grid px-4 py-2.5"
        style="grid-template-columns: auto 1fr auto auto; gap: 0 12px; border-bottom: 1px solid rgba(226,232,240,0.8);"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider" style="color: #94a3b8;">Day</span>
        <span class="text-[10px] font-bold uppercase tracking-wider" style="color: #94a3b8;">Stops</span>
        <span class="text-[10px] font-bold uppercase tracking-wider text-right" style="color: #94a3b8;">Revenue</span>
        <span class="text-[10px] font-bold uppercase tracking-wider text-right" style="color: #94a3b8;">Net</span>
      </div>
      <div class="flex flex-col divide-y" style="divide-color: rgba(226,232,240,0.8);">
        <div
          v-for="(day, idx) in dayHistory"
          :key="day.day"
          class="grid px-4 py-3 items-center"
          style="grid-template-columns: auto 1fr auto auto; gap: 0 12px;"
        >
          <span class="text-xs font-bold" style="color: #0f172a;">{{ dayLabel(idx) }}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs tabular-nums" style="color: #64748b;">{{ day.jobs_delivered }}/{{ day.jobs_attempted }}</span>
            <div
              v-if="day.wave_count > 1"
              class="text-[9px] font-bold px-1 py-0.5 rounded"
              style="background: rgba(219,234,254,0.8); color: #2563eb;"
            >{{ day.wave_count }}W</div>
          </div>
          <span class="text-xs font-semibold tabular-nums text-right" style="color: #059669;">
            +${{ day.revenue.toLocaleString() }}
          </span>
          <span
            class="text-xs font-bold tabular-nums text-right"
            :style="dayNet(day) >= 0 ? 'color: #059669;' : 'color: #dc2626;'"
          >
            {{ dayNet(day) >= 0 ? '+' : '' }}${{ dayNet(day).toLocaleString() }}
          </span>
        </div>
        <!-- Placeholder rows for days not yet played -->
        <div
          v-for="i in missingDays"
          :key="`missing-${i}`"
          class="grid px-4 py-3 items-center"
          style="grid-template-columns: auto 1fr auto auto; gap: 0 12px; opacity: 0.35;"
        >
          <span class="text-xs font-bold" style="color: #94a3b8;">{{ dayLabel(dayHistory.length + i - 1) }}</span>
          <span class="text-xs" style="color: #94a3b8;">—</span>
          <span class="text-xs text-right" style="color: #94a3b8;">—</span>
          <span class="text-xs text-right" style="color: #94a3b8;">—</span>
        </div>
      </div>
    </div>

    <!-- Weekly stats grid -->
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="stat in weekStats"
        :key="stat.label"
        class="rounded-xl px-4 py-3"
        style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
      >
        <p class="text-lg font-black tabular-nums leading-none" :style="`color: ${stat.color};`">{{ stat.value }}</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-1" style="color: #94a3b8;">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Reputation delta -->
    <div
      class="rounded-xl px-4 py-3"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: #64748b;">Reputation</span>
        <span class="text-xs font-bold tabular-nums" :style="reputationColor">{{ gameStore.company.reputation }}/100</span>
      </div>
      <div class="h-2.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
        <div
          class="h-full rounded-full transition-all"
          :style="`width: ${gameStore.company.reputation}%; background: ${reputationBar};`"
        />
      </div>
      <p class="text-[10px] mt-1.5" style="color: #94a3b8;">{{ reputationHint }}</p>
    </div>

    <div class="h-1"></div>
  </div>

  <!-- Footer -->
  <div class="flex-shrink-0 px-4 pb-5 pt-3" style="border-top: 1px solid rgba(226,232,240,0.8);">
    <button
      @click="emit('advance-week')"
      class="w-full text-sm font-bold text-white rounded-xl py-3.5 transition-all active:scale-95"
      style="background: linear-gradient(135deg, #7c3aed, #2563eb);"
    >
      Advance to Week {{ currentWeekNumber + 1 }}
      <svg class="inline-block ml-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useGameStore } from '~/stores/useGameStore'
import type { DayResult } from '~/types/game'

const emit = defineEmits<{ (e: 'advance-week'): void }>()

const dayStore = useDayStore()
const gameStore = useGameStore()

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Week number derived from the last completed day in history, or current_day
const currentWeekNumber = computed(() => {
  const lastDay = dayStore.day_history.at(-1)?.day ?? gameStore.company.current_day
  return Math.floor(lastDay / 5) + 1
})

const dayHistory = computed(() => dayStore.day_history)
const missingDays = computed(() => Math.max(0, 5 - dayHistory.value.length))

function dayLabel(idx: number): string {
  return DAY_NAMES[idx] ?? `Day ${idx + 1}`
}

function dayNet(day: DayResult): number {
  if (day.ledger) return day.ledger.net_profit
  return day.revenue - day.late_penalties - day.fuel_cost
}

const weekRevenue = computed(() =>
  dayHistory.value.reduce((s, d) => s + d.revenue, 0)
)

const weekCosts = computed(() =>
  dayHistory.value.reduce((s, d) => {
    if (d.ledger) return s + d.ledger.expense_payroll + d.ledger.expense_standby + d.ledger.expense_fuel + d.ledger.expense_demurrage + d.ledger.expense_congestion
    return s + d.late_penalties + d.fuel_cost
  }, 0)
)

const weekNetProfit = computed(() =>
  dayHistory.value.reduce((s, d) => s + (d.ledger?.net_profit ?? d.revenue - d.late_penalties - d.fuel_cost), 0)
)

const weekTotalDelivered = computed(() =>
  dayHistory.value.reduce((s, d) => s + d.jobs_delivered, 0)
)

const weekTotalAttempted = computed(() =>
  dayHistory.value.reduce((s, d) => s + d.jobs_attempted, 0)
)

const weekOnTimePct = computed(() => {
  const days = dayHistory.value
  if (days.length === 0) return 0
  const totalDelivered = days.reduce((s, d) => s + d.jobs_delivered, 0)
  if (totalDelivered === 0) return 0
  // Weight each day's on_time_rate by its delivered count for accuracy
  const onTimeTotal = days.reduce((s, d) => {
    const rate = d.on_time_rate ?? Math.round(((d.jobs_delivered - Math.round(d.late_penalties / 25)) / Math.max(1, d.jobs_delivered)) * 100)
    return s + rate * d.jobs_delivered
  }, 0)
  return Math.min(100, Math.round(onTimeTotal / totalDelivered))
})

const weekGrade = computed(() => {
  const pct = weekOnTimePct.value
  if (pct >= 90) return 'A'
  if (pct >= 75) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 45) return 'D'
  return 'F'
})

const weekGradeBadgeStyle = computed(() => {
  const g = weekGrade.value
  if (g === 'A') return 'background: rgba(240,253,244,0.9); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
  if (g === 'B') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  if (g === 'C') return 'background: rgba(255,251,235,0.9); color: #d97706; border: 1px solid rgba(253,230,138,0.5);'
  return 'background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(239,68,68,0.3);'
})

const weekStats = computed(() => [
  {
    label: 'Deliveries',
    value: `${weekTotalDelivered.value}/${weekTotalAttempted.value}`,
    color: '#059669',
  },
  {
    label: 'On-Time Rate',
    value: `${weekOnTimePct.value}%`,
    color: weekOnTimePct.value >= 90 ? '#059669' : weekOnTimePct.value >= 70 ? '#d97706' : '#dc2626',
  },
  {
    label: 'Total Fuel',
    value: `$${dayHistory.value.reduce((s, d) => s + d.fuel_cost, 0).toLocaleString()}`,
    color: '#dc2626',
  },
  {
    label: 'Late Fees',
    value: `$${dayHistory.value.reduce((s, d) => s + d.late_penalties, 0).toLocaleString()}`,
    color: dayHistory.value.some(d => d.late_penalties > 0) ? '#d97706' : '#94a3b8',
  },
])

const reputationColor = computed(() => {
  const r = gameStore.company.reputation
  return r >= 70 ? 'color: #059669;' : r >= 40 ? 'color: #d97706;' : 'color: #dc2626;'
})

const reputationBar = computed(() => {
  const r = gameStore.company.reputation
  return r >= 70 ? '#059669' : r >= 40 ? '#d97706' : '#dc2626'
})

const reputationHint = computed(() => {
  const r = gameStore.company.reputation
  if (r >= 80) return 'Excellent — customers are choosing you over competitors'
  if (r >= 60) return 'Good standing — keep on-time rates above 80%'
  if (r >= 40) return 'At risk — late deliveries are hurting your business'
  return 'Critical — improve delivery performance immediately'
})
</script>
