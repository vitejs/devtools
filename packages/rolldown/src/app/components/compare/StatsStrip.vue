<script setup lang="ts">
import { computed } from 'vue'

interface CompareStat {
  value: string
  label: string
  tone?: 'increase' | 'decrease'
  hidden?: boolean
}

const props = withDefaults(defineProps<{
  stats?: CompareStat[]
}>(), {
  stats: () => [],
})

const visibleStats = computed(() => props.stats.filter(stat => !stat.hidden))
</script>

<template>
  <div v-if="visibleStats.length" flex="~ items-baseline gap-1.5 wrap" min-w-0 text-xs>
    <template v-for="(stat, index) of visibleStats" :key="stat.label">
      <span v-if="index" op35>&middot;</span>
      <span inline-flex items-baseline gap-1>
        <span
          font-mono font-600
          :class="stat.tone === 'increase' ? 'text-red-500' : stat.tone === 'decrease' ? 'text-green-500' : 'op85'"
        >
          {{ stat.value }}
        </span>
        <span op55>{{ stat.label }}</span>
      </span>
    </template>
  </div>
</template>
