<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'

interface SingleSideDiffStat {
  value: string
  label: string
  tone?: 'increase' | 'decrease'
}

withDefaults(defineProps<{
  sessionLabel: string
  title: string
  titleMeta?: string
  delta: number
  format: 'bytes' | 'duration' | 'number'
  subtitle?: string
  badges?: string[]
  stats?: SingleSideDiffStat[]
}>(), {
  subtitle: '',
  titleMeta: '',
  badges: () => [],
  stats: () => [],
})
</script>

<template>
  <div class="border border-base rounded p4 flex flex-col gap-3 hover:bg-active">
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <div class="text-xs op50 mb1">
          {{ sessionLabel }}
        </div>
        <div class="flex items-baseline gap-2 min-w-0 font-mono" :title="titleMeta ? `${title} (${titleMeta})` : title">
          <span class="truncate">{{ title }}</span>
          <span v-if="titleMeta" class="flex-none op50">({{ titleMeta }})</span>
        </div>
        <div v-if="subtitle" class="truncate text-xs op55 mt1" :title="subtitle">
          {{ subtitle }}
        </div>
      </div>
      <CompareDeltaValue :value="delta" :format="format" signed />
    </div>

    <div v-if="badges.length || stats.length" class="flex items-center gap-2 flex-wrap text-xs">
      <DisplayBadge v-for="badge of badges" :key="badge" :text="badge" />
      <CompareStatsStrip :stats="stats" />
    </div>
  </div>
</template>
