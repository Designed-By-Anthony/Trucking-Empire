<template>
  <div class="fe-stat">
    <span class="fe-stat__label">{{ label }}</span>
    <span class="fe-stat__value" :class="valueClass">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  valueClass?: string
}>()
</script>
