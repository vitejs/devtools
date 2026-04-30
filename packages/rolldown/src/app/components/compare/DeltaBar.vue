<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  delta: number
  maxDelta?: number
}>(), {
  maxDelta: 1,
})

const width = computed(() => {
  if (!props.maxDelta)
    return 0
  return Math.min(Math.abs(props.delta) / props.maxDelta * 50, 50)
})

const style = computed(() => {
  if (props.delta >= 0) {
    return {
      left: '50%',
      width: `${width.value}%`,
    }
  }

  return {
    left: `${50 - width.value}%`,
    width: `${width.value}%`,
  }
})

const barClass = computed(() => {
  if (props.delta > 0)
    return 'bg-red-500/80'
  if (props.delta < 0)
    return 'bg-green-500/80'
  return 'bg-gray-500/50'
})
</script>

<template>
  <div h-7 relative flex="~ items-center">
    <div absolute inset-x-0 h-1 rounded-full bg-base />
    <div absolute left="1/2" top-0 bottom-0 w-px bg-base />
    <div absolute h-2 rounded-full :class="barClass" :style="style" />
  </div>
</template>
