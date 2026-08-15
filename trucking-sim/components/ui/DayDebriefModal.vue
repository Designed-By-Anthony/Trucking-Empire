<template>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-5 py-4 flex-shrink-0"
    style="border-bottom: 1px solid rgba(226,232,240,0.8);"
  >
    <div>
      <h2 class="text-base font-bold" style="color: #0f172a;">Day Complete</h2>
      <p class="text-xs mt-0.5" style="color: #94a3b8;">
        Day {{ dayStore.day_result?.day ?? gameStore.company.current_day + 1 }}
        &nbsp;&middot;&nbsp;
        {{ formattedDate }}
      </p>
    </div>
    <!-- Overall grade badge -->
    <div
      class="text-sm font-black rounded-lg px-3 py-1.5"
      :style="gradeBadgeStyle"
    >{{ grade }}</div>
  </div>

  <!-- Scrollable body -->
  <div class="modal-body flex flex-col gap-4 px-4 py-4">

    <!-- Revenue hero card -->
    <div
      class="rounded-xl px-5 py-4"
      :style="netShift >= 0
        ? 'background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);'
        : 'background: rgba(254,242,242,0.9); border: 1px solid rgba(239,68,68,0.3);'"
    >
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" :style="netShift >= 0 ? 'color:#059669;' : 'color:#dc2626;'">
        {{ netShift >= 0 ? 'Net Shift Profit' : 'Net Loss' }}
      </p>
      <p
        class="text-3xl font-black tabular-nums leading-none"
        :style="netShift >= 0 ? 'color:#059669; letter-spacing:-0.04em;' : 'color:#dc2626; letter-spacing:-0.04em;'"
      >
        {{ netShift >= 0 ? '+' : '' }}${{ Math.abs(netShift).toLocaleString() }}
      </p>
      <!-- Earnings breakdown -->
      <div class="mt-3 flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[11px]" style="color: #64748b;">Gross Revenue</span>
          <span class="text-[11px] font-semibold tabular-nums" style="color: #059669;">+${{ (result?.revenue ?? 0).toLocaleString() }}</span>
        </div>
        <div v-if="(result?.late_penalties ?? 0) > 0" class="flex items-center justify-between">
          <span class="text-[11px]" style="color: #64748b;">Late Penalties</span>
          <span class="text-[11px] font-semibold tabular-nums" style="color: #dc2626;">−${{ (result?.late_penalties ?? 0).toLocaleString() }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[11px]" style="color: #64748b;">Fuel Cost</span>
          <span class="text-[11px] font-semibold tabular-nums" style="color: #dc2626;">−${{ (result?.fuel_cost ?? 0).toLocaleString() }}</span>
        </div>
        <div v-if="dailyWages > 0" class="flex items-center justify-between">
          <span class="text-[11px]" style="color: #64748b;">Driver Wages</span>
          <span class="text-[11px] font-semibold tabular-nums" style="color: #dc2626;">−${{ dailyWages.toLocaleString() }}</span>
        </div>
        <div class="flex items-center justify-between pt-1 mt-0.5" style="border-top: 1px solid rgba(226,232,240,0.5);">
          <span class="text-[11px] font-bold" style="color: #0f172a;">Net After Wages</span>
          <span class="text-[11px] font-black tabular-nums" :style="netAfterWages >= 0 ? 'color: #059669;' : 'color: #dc2626;'">
            {{ netAfterWages >= 0 ? '+' : '' }}${{ Math.abs(netAfterWages).toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Wave breakdown (only show if more than 1 wave ran) -->
    <div
      v-if="(result?.wave_count ?? 1) > 1 || (result?.relay_count ?? 0) > 0"
      class="rounded-xl px-4 py-3 flex items-center justify-around"
      style="background: rgba(239,246,255,0.9); border: 1px solid rgba(147,197,253,0.5);"
    >
      <div class="text-center">
        <p class="text-lg font-black tabular-nums" style="color: #2563eb;">{{ result?.wave_count ?? 1 }}</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #64748b;">Waves</p>
      </div>
      <div class="w-px self-stretch" style="background: rgba(147,197,253,0.4);"></div>
      <div class="text-center">
        <p class="text-lg font-black tabular-nums" style="color: #2563eb;">{{ result?.relay_count ?? 0 }}</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #64748b;">Relays</p>
      </div>
      <div class="w-px self-stretch" style="background: rgba(147,197,253,0.4);"></div>
      <div class="text-center">
        <p class="text-lg font-black tabular-nums" style="color: #2563eb;">{{ stopsPerWaveLabel }}</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #64748b;">Stops/Wave</p>
      </div>
      <div class="w-px self-stretch" style="background: rgba(147,197,253,0.4);"></div>
      <div class="text-center">
        <p class="text-lg font-black tabular-nums" style="color: #2563eb;">30m</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #64748b;">Dwell/Relay</p>
      </div>
    </div>

    <!-- Per-truck breakdown (only when multiple trucks ran) -->
    <div v-if="truckSummaries.length > 1" class="rounded-xl overflow-hidden" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <p class="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5" style="color: #64748b; border-bottom: 1px solid rgba(226,232,240,0.8);">Fleet Results</p>
      <div v-for="t in truckSummaries" :key="t.truckId" class="flex items-center justify-between px-4 py-2.5" style="border-bottom: 1px solid rgba(226,232,240,0.6);">
        <div>
          <p class="text-[11px] font-bold" style="color: #0f172a;">{{ t.truckName }}</p>
          <p class="text-[10px]" style="color: #94a3b8;">{{ t.delivered }}/{{ t.attempted }} stops · {{ t.driverName }}</p>
        </div>
        <span class="text-[11px] font-black tabular-nums" :style="t.revenue > 0 ? 'color: #059669;' : 'color: #94a3b8;'">${{ t.revenue.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Brand SLA progress (only when contracts are active) -->
    <div v-if="brandStore.activeContracts.length > 0" class="rounded-xl overflow-hidden" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <p class="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5" style="color: #64748b; border-bottom: 1px solid rgba(226,232,240,0.8);">Brand SLA</p>
      <div v-for="c in brandStore.activeContracts" :key="c.id" class="px-4 py-3" style="border-bottom: 1px solid rgba(226,232,240,0.6);">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold" style="color: #0f172a;">{{ c.brand_name }}</span>
          <span class="text-[11px] font-black tabular-nums" :style="c.weekly_volume_delivered >= c.weekly_volume_target ? 'color: #059669;' : 'color: #64748b;'">
            {{ c.weekly_volume_delivered }}/{{ c.weekly_volume_target }}
          </span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div class="h-full rounded-full transition-all" :style="{ width: `${Math.min(100, (c.weekly_volume_delivered / c.weekly_volume_target) * 100)}%`, background: c.weekly_volume_delivered >= c.weekly_volume_target ? '#059669' : '#3b82f6' }" />
        </div>
        <p v-if="c.weekly_volume_delivered >= c.weekly_volume_target" class="text-[10px] mt-1 font-semibold" style="color: #059669;">✓ SLA met — ${{ c.weekly_retainer.toLocaleString() }} bonus on day {{ c.week_start_day + 5 }}</p>
        <p v-else class="text-[10px] mt-1" style="color: #94a3b8;">{{ c.weekly_volume_target - c.weekly_volume_delivered }} pkgs to go · Day {{ Math.min(5, gameStore.company.current_day - c.week_start_day + 1) }} of 5</p>
      </div>
    </div>

    <!-- 3-col summary -->
    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="stat in summaryStats"
        :key="stat.label"
        class="rounded-xl px-3 py-3 text-center"
        style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
      >
        <p class="text-xl font-black tabular-nums leading-none" :style="`color: ${stat.color};`">{{ stat.value }}</p>
        <p class="text-[10px] font-semibold uppercase tracking-wider mt-1" style="color: #94a3b8;">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Scores section -->
    <div
      class="rounded-xl px-4 py-4 flex flex-col gap-4"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <p class="text-xs font-bold uppercase tracking-widest" style="color: #64748b;">Performance</p>

      <!-- On-time rate -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold" style="color: #0f172a;">On-Time Rate</span>
          <span class="text-xs font-bold tabular-nums" :style="`color: ${onTimeColor};`">{{ onTimePct }}%</span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div
            class="h-full rounded-full transition-all"
            :style="`width: ${onTimePct}%; background: ${onTimeColor};`"
          />
        </div>
      </div>

      <!-- Density score -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold" style="color: #0f172a;">Route Density</span>
          <span class="text-xs font-bold tabular-nums" :style="`color: ${densityColor(result?.density_score ?? 0)};`">
            {{ result?.density_score ?? 0 }}/100
          </span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div
            class="h-full rounded-full transition-all"
            :style="`width: ${result?.density_score ?? 0}%; background: ${densityColor(result?.density_score ?? 0)};`"
          />
        </div>
        <p class="text-[10px] mt-1" style="color: #94a3b8;">
          {{ densityHint(result?.density_score ?? 0) }}
        </p>
      </div>

      <!-- Time split -->
      <div class="flex items-center justify-between pt-1" style="border-top: 1px solid rgba(226,232,240,0.8);">
        <div class="text-center flex-1">
          <p class="text-sm font-bold tabular-nums" style="color: #0f172a;">{{ fmtHours(result?.stem_time_hours ?? 0) }}h</p>
          <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #94a3b8;">Driving</p>
        </div>
        <div class="w-px self-stretch" style="background: rgba(226,232,240,0.8);"></div>
        <div class="text-center flex-1">
          <p class="text-sm font-bold tabular-nums" style="color: #0f172a;">{{ fmtHours(result?.in_zone_hours ?? 0) }}h</p>
          <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #94a3b8;">Delivering</p>
        </div>
      </div>
    </div>

    <!-- Stop log -->
    <div
      class="rounded-xl overflow-hidden"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <p class="text-xs font-bold uppercase tracking-widest px-4 py-3" style="color: #64748b; border-bottom: 1px solid rgba(226,232,240,0.8);">
        Stop Log
      </p>
      <div class="flex flex-col divide-y" style="--tw-divide-opacity:1; divide-color: rgba(226,232,240,0.8);">
        <div
          v-for="(stop, idx) in allStops"
          :key="stop.job.id"
          class="flex items-center gap-3 px-4 py-3"
        >
          <!-- Status icon -->
          <div
            class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            :style="stopIconBg(stop)"
          >
            <!-- Check: delivered on time -->
            <svg v-if="stop.on_time === true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="stopIconColor(stop)">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <!-- Clock: delivered late -->
            <svg v-else-if="stop.on_time === false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="stopIconColor(stop)">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 15.5 15.5"/>
            </svg>
            <!-- X: missed / failed -->
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="stopIconColor(stop)">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>

          <!-- Stop info -->
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold truncate" style="color: #0f172a;">{{ stop.job.customer_name }}</p>
            <p class="text-[10px] truncate mt-0.5" style="color: #94a3b8;">{{ stop.job.delivery_address }}</p>
          </div>

          <!-- Right: payout + time -->
          <div class="flex-shrink-0 text-right">
            <p
              class="text-xs font-bold tabular-nums"
              :style="stop.job.status === 'delivered' ? 'color: #059669;' : 'color: #dc2626;'"
            >
              {{ stop.job.status === 'delivered' ? `+$${stop.job.payout}` : 'MISSED' }}
            </p>
            <p v-if="stop.eta_game_hour" class="text-[10px] tabular-nums mt-0.5" style="color: #94a3b8;">
              {{ fmtHour(stop.eta_game_hour) }}
            </p>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="allStops.length === 0" class="px-4 py-6 text-center">
          <p class="text-xs" style="color: #94a3b8;">No stops were planned for this day.</p>
        </div>
      </div>
    </div>

    <!-- Spacer so button doesn't clip last card -->
    <div class="h-1"></div>
  </div>

  <!-- Footer: start new day / view week summary -->
  <div class="flex-shrink-0 px-4 pb-5 pt-3" style="border-top: 1px solid rgba(226,232,240,0.8);">
    <button
      v-if="!isWeekEnd"
      @click="emit('start-new-day')"
      class="w-full text-sm font-bold text-white rounded-xl py-3.5 transition-all active:scale-95"
      style="background: #2563eb;"
    >
      Start New Day
      <svg class="inline-block ml-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
    <button
      v-else
      @click="emit('view-week-summary')"
      class="w-full text-sm font-bold text-white rounded-xl py-3.5 transition-all active:scale-95"
      style="background: linear-gradient(135deg, #7c3aed, #2563eb);"
    >
      View Week 1 Summary
      <svg class="inline-block ml-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3v18h18"/><polyline points="18 9 22 5 18 1"/><polyline points="22 5 22 19 8 19"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useBrandContractStore } from '~/stores/useBrandContractStore'
import type { ManifestStop } from '~/types/game'

const emit = defineEmits<{
  (e: 'start-new-day'): void
  (e: 'view-week-summary'): void
}>()

const dayStore = useDayStore()
const gameStore = useGameStore()
const fleetStore = useFleetStore()
const brandStore = useBrandContractStore()

const result = computed(() => dayStore.day_result)

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtHour(h: number): string {
  const hour = Math.floor(h) % 24
  const min = Math.round((h - Math.floor(h)) * 60)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`
}

function fmtHours(h: number): string {
  return h.toFixed(1)
}

function densityColor(score: number): string {
  if (score >= 70) return '#059669'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function densityHint(score: number): string {
  if (score >= 70) return 'Tight cluster — excellent stop density'
  if (score >= 40) return 'Moderate spread — consider tighter zones'
  return 'Wide spread — high stem time, low efficiency'
}

// ─── Computed data ─────────────────────────────────────────────────────────

const dailyWages = computed(() =>
  fleetStore.drivers.filter(d => !d.is_owner_op && d.daily_wage > 0).reduce((s, d) => s + d.daily_wage, 0)
)

const netRevenue = computed(() => {
  if (!result.value) return 0
  return result.value.revenue - result.value.late_penalties
})

const netShift = computed(() => {
  if (!result.value) return 0
  return result.value.revenue - result.value.late_penalties - result.value.fuel_cost
})

const netAfterWages = computed(() => netShift.value - dailyWages.value)

// All stops across every truck's route (for stop log in multi-truck mode)
const allStops = computed((): ManifestStop[] => {
  const routes = Object.values(dayStore.fleet_routes)
  if (routes.length === 0) return dayStore.manifest.filter(s => s.stop_type !== 'terminal_return')
  return routes.flatMap(r => r.manifest.filter(s => s.stop_type !== 'terminal_return'))
})

// Per-truck results for the fleet summary row
const truckSummaries = computed(() => {
  return Object.entries(dayStore.fleet_routes).map(([truckId, route]) => {
    const truck = fleetStore.getTruckById(truckId)
    const driver = route.driver_id ? fleetStore.getDriverById(route.driver_id) : null
    const real = route.manifest.filter(s => s.stop_type !== 'terminal_return')
    const delivered = real.filter(s => s.job.status === 'delivered')
    return {
      truckId,
      truckName: truck?.name ?? truckId,
      driverName: driver?.name ?? 'No driver',
      attempted: real.length,
      delivered: delivered.length,
      revenue: delivered.reduce((sum, s) => sum + s.job.payout, 0),
    }
  })
})

const stopsPerWaveLabel = computed(() => {
  if (!result.value) return '—'
  const waves = result.value.wave_count || 1
  const stops = result.value.jobs_attempted
  return stops === 0 ? '0' : `~${Math.round(stops / waves)}`
})

// Days are 0-indexed; day 4 = the 5th working day = end of Week 1
const isWeekEnd = computed(() => (result.value?.day ?? -1) >= 4)

const onTimeCount = computed(() =>
  dayStore.manifest.filter(s => s.on_time === true).length,
)

const onTimePct = computed(() => {
  const delivered = result.value?.jobs_delivered ?? 0
  if (delivered === 0) return 0
  return Math.round((onTimeCount.value / delivered) * 100)
})

const onTimeColor = computed(() => {
  if (onTimePct.value >= 90) return '#059669'
  if (onTimePct.value >= 70) return '#d97706'
  return '#dc2626'
})

const grade = computed(() => {
  const pct = onTimePct.value
  const density = result.value?.density_score ?? 0
  const avg = (pct + density) / 2
  if (avg >= 90) return 'A'
  if (avg >= 75) return 'B'
  if (avg >= 60) return 'C'
  if (avg >= 45) return 'D'
  return 'F'
})

const gradeBadgeStyle = computed(() => {
  const g = grade.value
  if (g === 'A') return 'background: rgba(240,253,244,0.9); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
  if (g === 'B') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  if (g === 'C') return 'background: rgba(255,251,235,0.9); color: #d97706; border: 1px solid rgba(253,230,138,0.5);'
  return 'background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(239,68,68,0.3);'
})

const formattedDate = computed(() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const tick = result.value?.date_tick_start ?? gameStore.company.date_tick
  const dayOfWeek = Math.floor(tick / 24) % 7
  return days[dayOfWeek]
})

const summaryStats = computed(() => [
  {
    label: 'Delivered',
    value: result.value?.jobs_delivered ?? 0,
    color: '#059669',
  },
  {
    label: 'Failed',
    value: result.value?.jobs_failed ?? 0,
    color: (result.value?.jobs_failed ?? 0) > 0 ? '#dc2626' : '#94a3b8',
  },
  {
    label: 'Declined',
    value: result.value?.jobs_declined ?? 0,
    color: '#94a3b8',
  },
])

// ─── Stop log helpers ──────────────────────────────────────────────────────

function stopIconBg(stop: ManifestStop): string {
  if (stop.on_time === true) return 'background: rgba(240,253,244,0.9);'
  if (stop.on_time === false) return 'background: rgba(255,251,235,0.9);'
  return 'background: rgba(254,242,242,0.9);'
}

function stopIconColor(stop: ManifestStop): string {
  if (stop.on_time === true) return 'color: #059669;'
  if (stop.on_time === false) return 'color: #d97706;'
  return 'color: #dc2626;'
}
</script>
