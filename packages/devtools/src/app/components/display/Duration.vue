<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    duration: number | undefined
    factor?: number
    unit?: 'ms' | 'ns'
    color?: boolean
  }>(),
  {
    factor: 1,
    color: true,
    unit: 'ms',
  },
)

const ms = computed(() => {
  if (props.duration == null)
    return undefined
  if (props.unit === 'ns')
    return props.duration / 1000
  return props.duration
})

function getDurationColor(ms: number | undefined) {
  if (!props.color)
    return ''
  if (ms == null)
    return ''
  ms = ms * props.factor
  if (ms < 1)
    return 'op50'
  if (ms > 10000)
    return 'color-scale-critical'
  if (ms > 1000)
    return 'color-scale-high'
  if (ms > 500)
    return 'color-scale-medium'
  if (ms > 200)
    return 'color-scale-low'
  return 'color-scale-neutral'
}

const units = computed(() => {
  if (ms.value == null)
    return ['', '-']
  if (ms.value < 1)
    return ['<1', 'ms']
  if (ms.value < 1000)
    return [ms.value.toFixed(0), 'ms']
  if (ms.value < 1000 * 60)
    return [(ms.value / 1000).toFixed(1), 's']
  return [(ms.value / 1000 / 60).toFixed(1), 'min']
})
</script>

<template>
  <DisplayNumberWithUnit
    :class="getDurationColor(ms)"
    :number="units[0]!" :unit="units[1]!"
  />
</template>
