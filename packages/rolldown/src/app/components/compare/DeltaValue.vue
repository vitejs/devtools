<script setup lang="ts">
import { bytesToHumanSize } from '@vitejs/devtools-ui/utils/format'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  format?: 'bytes' | 'duration' | 'number'
  signed?: boolean
}>(), {
  format: 'number',
  signed: false,
})

const sign = computed(() => {
  if (!props.signed || props.value === 0)
    return ''
  return props.value > 0 ? '+' : '-'
})

const colorClass = computed(() => {
  if (!props.signed || props.value === 0)
    return 'text-gray-500'
  return props.value > 0 ? 'text-red-500' : 'text-green-500'
})

const formatted = computed(() => {
  const value = props.signed ? Math.abs(props.value) : props.value

  if (props.format === 'bytes') {
    if (value === 0) {
      return {
        amount: 0,
        unit: 'B',
      }
    }
    const [amount, unit] = bytesToHumanSize(value)
    return { amount, unit }
  }

  if (props.format === 'duration') {
    if (value >= 1000) {
      return {
        amount: +(value / 1000).toFixed(2),
        unit: 's',
      }
    }
    return {
      amount: Math.round(value),
      unit: 'ms',
    }
  }

  return {
    amount: value.toLocaleString(),
    unit: '',
  }
})
</script>

<template>
  <span font-mono ws-nowrap :class="colorClass">
    {{ sign }}{{ formatted.amount }}<span v-if="formatted.unit" text-xs op75 ml-0.5>{{ formatted.unit }}</span>
  </span>
</template>
