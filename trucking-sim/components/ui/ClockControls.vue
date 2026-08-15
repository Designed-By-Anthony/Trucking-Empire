<template>
  <div class="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
    <button
      v-for="option in speeds"
      :key="option.value"
      @click="gameStore.setClockSpeed(option.value)"
      :class="[
        'px-2.5 py-1 rounded text-xs font-bold transition-all',
        gameStore.clock_speed === option.value
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/useGameStore'
import type { ClockSpeed } from '~/types/game'

const gameStore = useGameStore()

const speeds: { value: ClockSpeed; label: string }[] = [
  { value: 0, label: '⏸' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]
</script>
