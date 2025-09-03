<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  previous: number
}>()

const isNotChanged = computed(() => props.previous === props.current)
const normalizedPercent = computed(() => Math.abs((props.current - props.previous) / props.previous * 100).toFixed(isNotChanged.value ? 0 : 2))
const trendSymbol = computed(() => isNotChanged.value ? '' : (props.current > props.previous ? '+' : '-'))
const comparisonColorClass = computed(() => isNotChanged.value ? 'text-gray-500' : (props.current > props.previous ? 'text-green-500' : 'text-red-500'))
</script>

<template>
  <span
    text-4 mt-1 font-mono
    :class="comparisonColorClass"
  >
    {{ trendSymbol }}{{ normalizedPercent }}%
  </span>
</template>
