<template>
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fe-text-3);">{{ label }}</span>
      <span style="font-size: 11px; font-variant-numeric: tabular-nums; color: var(--fe-text-2); font-weight: 600;">{{ text }}</span>
    </div>
    <div class="fe-bar">
      <div class="fe-bar__fill" :style="{ width: `${clampedValue}%`, background: fillColor }" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: number
  color: 'green' | 'yellow' | 'blue' | 'red'
  text: string
}>()

const clampedValue = computed(() => Math.min(100, Math.max(0, props.value)))

const fillColor = computed(() => {
  if (props.value < 20) return 'var(--fe-red)'
  if (props.value < 40) return 'var(--fe-amber)'
  return {
    green:  'var(--fe-green)',
    yellow: 'var(--fe-amber)',
    blue:   'var(--fe-blue)',
    red:    'var(--fe-red)',
  }[props.color]
})
</script>
