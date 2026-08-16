<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <div>
      <h2 class="text-base font-bold" style="color: #0f172a;">On Route</h2>
      <p class="text-xs" style="color: #94a3b8;">
        Stop {{ dayStore.current_stop_index + 1 }} of {{ dayStore.manifest.length }}
      </p>
    </div>
    <span class="text-xs font-bold" style="background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5); border-radius: 6px; padding: 2px 10px;">
      ${{ earnedSoFar.toLocaleString() }} earned
    </span>
  </div>

  <div class="modal-body p-4 flex flex-col gap-4" style="overflow-y: auto;">

    <!-- Current stop card -->
    <div
      v-if="currentStop"
      class="rounded-xl p-4 flex flex-col gap-3 transition-all duration-500"
      :style="isDriving
        ? 'background: rgba(239,246,255,0.9); border: 1px solid rgba(147,197,253,0.5);'
        : 'background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);'"
    >
      <!-- Status row -->
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full flex-shrink-0"
          :style="isDriving
            ? 'background: #2563eb; animation: pulse 1.5s ease-in-out infinite;'
            : 'background: #059669;'"
        />
        <span class="text-[10px] font-black uppercase tracking-widest" :style="isDriving ? 'color: #2563eb;' : 'color: #059669;'">
          {{ isDriving
            ? (currentStop.job.job_type === 'pickup' ? 'Heading to Pickup' : 'En Route')
            : (currentStop.job.job_type === 'pickup' ? 'Loading' : 'Unloading Freight') }}
        </span>
        <span class="ml-auto text-[10px] font-bold" style="color: #64748b;">
          {{ isDriving ? `ETA ${fmtHour(currentStop.eta_game_hour)}` : `${dwellRemainingMin}m remaining` }}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
        <div
          class="h-full rounded-full transition-all duration-1000"
          :style="{
            width: `${Math.min(stopProgress, 100)}%`,
            background: isDriving ? '#2563eb' : '#059669',
          }"
        />
      </div>

      <!-- Customer info -->
      <div>
        <p class="text-sm font-black leading-snug" style="color: #0f172a;">{{ currentStop.job.customer_name }}</p>
        <p class="text-xs mt-0.5" style="color: #64748b;">
          {{ currentStop.job.job_type === 'pickup' ? currentStop.job.pickup_address : currentStop.job.delivery_address }}
        </p>
      </div>

      <!-- Stats badges -->
      <div class="flex flex-wrap gap-1.5">
        <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 7px;">
          {{ currentStop.job.weight_lbs }} lbs
        </span>
        <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 7px;">
          {{ currentStop.job.volume_ft3 }} ft³
        </span>
        <span class="text-[10px] font-bold" style="background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5); border-radius: 6px; padding: 2px 7px;">
          +${{ currentStop.job.payout }}
        </span>
        <span
          v-for="tag in currentStop.job.equipment_tags"
          :key="tag"
          class="text-[10px] font-bold"
          style="background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5); border-radius: 6px; padding: 2px 7px;"
        >{{ tag === 'liftgate' ? 'LIFT' : tag === 'dock_high' ? 'DOCK' : tag.toUpperCase() }}</span>
      </div>
    </div>

    <!-- All stops done — heading back -->
    <div
      v-else
      class="rounded-xl p-5 text-center"
      style="background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);"
    >
      <svg class="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.75" stroke-linecap="round">
        <path d="M5 12l5 5L20 7"/>
      </svg>
      <p class="text-sm font-bold" style="color: #059669;">All stops complete</p>
      <p class="text-xs mt-0.5" style="color: #64748b;">Heading back to base…</p>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-xl p-3 text-center" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-lg font-black tabular-nums" style="color: #059669;">{{ completed }}</p>
        <p class="text-[10px] font-semibold" style="color: #94a3b8;">Done</p>
      </div>
      <div class="rounded-xl p-3 text-center" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-lg font-black tabular-nums" style="color: #0f172a;">{{ remaining }}</p>
        <p class="text-[10px] font-semibold" style="color: #94a3b8;">Left</p>
      </div>
      <div class="rounded-xl p-3 text-center" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-lg font-black tabular-nums" style="color: #0f172a;">{{ gameTimeFmt }}</p>
        <p class="text-[10px] font-semibold" style="color: #94a3b8;">Time</p>
      </div>
    </div>

    <!-- Upcoming stops -->
    <div v-if="upcomingStops.length > 0" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <p class="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style="color: #94a3b8;">Up Next</p>
        <div class="flex-1 h-px" style="background: rgba(226,232,240,0.8);"></div>
      </div>
      <div
        v-for="stop in upcomingStops"
        :key="stop.job.id"
        class="rounded-xl px-3 py-2.5 flex items-center gap-3"
        style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
      >
        <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
             style="background: rgba(226,232,240,0.8); color: #64748b;">
          {{ stop.sequence }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1">
            <span
              v-if="stop.job.job_type === 'pickup'"
              class="flex-shrink-0 text-[8px] font-black rounded px-1"
              style="background: rgba(254,243,199,0.9); color: #d97706;"
            >PU</span>
            <p class="text-xs font-bold truncate" style="color: #0f172a;">{{ stop.job.customer_name }}</p>
          </div>
          <p class="text-[10px]" style="color: #94a3b8;">~{{ fmtHour(stop.eta_game_hour) }}</p>
        </div>
        <span class="text-[10px] font-bold flex-shrink-0" style="color: #059669;">+${{ stop.job.payout }}</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useGameStore } from '~/stores/useGameStore'
import { serviceHoursForStop } from '~/composables/useServiceTime'

const dayStore = useDayStore()
const gameStore = useGameStore()

const currentTick = computed(() => gameStore.company.date_tick)
const currentStop = computed(() => dayStore.manifest[dayStore.current_stop_index] ?? null)
const completionTick = computed(() =>
  currentStop.value ? currentStop.value.eta_game_hour + serviceHoursForStop(currentStop.value) : 0
)

// En route vs at-stop state
const isDriving = computed(() =>
  currentStop.value ? currentTick.value < currentStop.value.eta_game_hour : false
)

// Minutes remaining in the current stop dwell (0 when driving)
const dwellRemainingMin = computed(() => {
  if (!currentStop.value || isDriving.value) return 0
  const remaining = completionTick.value - currentTick.value
  return Math.max(0, Math.ceil(remaining * 60))
})

// Progress bar 0–100 for current leg
const stopProgress = computed(() => {
  if (!currentStop.value) return 100
  const idx = dayStore.current_stop_index

  if (isDriving.value) {
    const prevStop = dayStore.manifest[idx - 1]
    const prevTick = idx === 0
      ? dayStore.departure_hour
      : (prevStop?.eta_game_hour ?? dayStore.departure_hour) + (prevStop ? serviceHoursForStop(prevStop) : 0)
    const total = currentStop.value.eta_game_hour - prevTick
    if (total <= 0) return 100
    return Math.max(0, Math.min(100, ((currentTick.value - prevTick) / total) * 100))
  } else {
    const total = serviceHoursForStop(currentStop.value)
    return Math.max(0, Math.min(100, ((currentTick.value - currentStop.value.eta_game_hour) / total) * 100))
  }
})

const completed = computed(() => dayStore.manifest.filter(s => s.job.status === 'delivered').length)
const remaining = computed(() => dayStore.manifest.length - dayStore.current_stop_index)
const earnedSoFar = computed(() => dayStore.manifest
  .filter(s => s.job.status === 'delivered')
  .reduce((sum, s) => sum + s.job.payout, 0)
)
const upcomingStops = computed(() =>
  dayStore.manifest.slice(dayStore.current_stop_index + 1, dayStore.current_stop_index + 4)
)

const gameTimeFmt = computed(() => {
  const tick = currentTick.value % 24
  const h = Math.floor(tick)
  const m = Math.floor((tick - h) * 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
})

function fmtHour(h: number): string {
  const totalMinutes = Math.round(h * 60)
  const hour = Math.floor(totalMinutes / 60) % 24
  const min = totalMinutes % 60
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hh = hour % 12 || 12
  return min === 0 ? `${hh}:00 ${ampm}` : `${hh}:${String(min).padStart(2, '0')} ${ampm}`
}
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
