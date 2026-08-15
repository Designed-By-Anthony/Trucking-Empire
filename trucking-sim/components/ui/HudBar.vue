<template>
  <div
    class="flex items-center gap-3 px-4 py-2.5 rounded-full w-full"
    style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.9) inset;
    "
  >
    <!-- Cash -->
    <div class="flex-1 flex items-center gap-1.5 min-w-0">
      <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" :style="{ color: cashColor }">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
      </svg>
      <span
        class="text-sm font-bold tabular-nums tracking-tight truncate"
        :style="{ color: cashColor }"
      >{{ gameStore.formattedCash }}</span>
    </div>

    <!-- Speed segmented control -->
    <div
      class="flex items-center gap-0.5 p-0.5 rounded-full flex-shrink-0"
      style="background: rgba(241,245,249,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <button
        v-for="opt in speeds"
        :key="opt.value"
        @click="gameStore.setClockSpeed(opt.value)"
        class="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-150"
        :style="gameStore.clock_speed === opt.value
          ? 'background: #2563eb; color: white; box-shadow: 0 2px 8px rgba(37,99,235,0.4);'
          : 'color: #94a3b8;'"
      >{{ opt.label }}</button>
    </div>

    <!-- Time + active trucks -->
    <div class="flex flex-col items-end gap-0.5 min-w-0">
      <span class="text-xs font-semibold tabular-nums" style="color: #0f172a;">{{ gameStore.formattedTime }}</span>
      <div class="flex items-center gap-1">
        <span
          v-if="fleetStore.activeTrucks.length > 0"
          class="w-1.5 h-1.5 rounded-full"
          style="background: #10b981; box-shadow: 0 0 6px #10b981;"
        />
        <span class="text-[10px] font-medium" style="color: #94a3b8;">
          {{ fleetStore.activeTrucks.length > 0 ? `${fleetStore.activeTrucks.length} active` : 'parked' }}
        </span>
      </div>
    </div>

    <!-- Nuke & Restart — long-press or double-tap to reveal confirm -->
    <button
      @click="handleNukeClick"
      class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
      :style="nukeArmed
        ? 'background: #dc2626; color: white;'
        : 'background: rgba(0,0,0,0.05); color: #cbd5e1;'"
      :title="nukeArmed ? 'Tap again to wipe all data and restart' : 'Hold to reset'"
    >
      <svg v-if="!nukeArmed" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
      <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import type { ClockSpeed } from '~/types/game'

const gameStore = useGameStore()
const fleetStore = useFleetStore()

const speeds: { value: ClockSpeed; label: string }[] = [
  { value: 0, label: '⏸' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

const cashColor = computed(() =>
  gameStore.company.cash < 0 ? '#dc2626' : '#059669'
)

// Two-tap nuke guard: first tap arms it (turns red), second tap within 3s fires it.
const nukeArmed = ref(false)
let nukeTimer: ReturnType<typeof setTimeout> | null = null

function handleNukeClick() {
  if (!nukeArmed.value) {
    nukeArmed.value = true
    nukeTimer = setTimeout(() => { nukeArmed.value = false }, 3000)
  } else {
    if (nukeTimer) clearTimeout(nukeTimer)
    nukeArmed.value = false
    gameStore.nukeAndResetGame()
  }
}
</script>
