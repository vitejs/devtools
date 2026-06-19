<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'

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
  <div border="~ base rounded" p4 flex="~ col gap-3" hover="bg-active">
    <div flex="~ items-start gap-3">
      <div min-w-0 flex-1>
        <div text-xs op50 mb1>
          {{ sessionLabel }}
        </div>
        <div flex="~ items-baseline gap-2" min-w-0 font-mono :title="titleMeta ? `${title} (${titleMeta})` : title">
          <span truncate>{{ title }}</span>
          <span v-if="titleMeta" flex-none op50>({{ titleMeta }})</span>
        </div>
        <div v-if="subtitle" truncate text-xs op55 mt1 :title="subtitle">
          {{ subtitle }}
        </div>
      </div>
      <CompareDeltaValue :value="delta" :format="format" signed />
    </div>

    <div v-if="badges.length || stats.length" flex="~ items-center gap-2 wrap" text-xs>
      <DisplayBadge v-for="badge of badges" :key="badge" :text="badge" />
      <CompareStatsStrip :stats="stats" />
    </div>
  </div>
</template>
