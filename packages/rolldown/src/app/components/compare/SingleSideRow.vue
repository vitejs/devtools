<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'

interface SingleSideDiffStat {
  value: string
  label: string
  tone?: 'increase' | 'decrease'
}

withDefaults(defineProps<{
  status: 'added' | 'removed'
  sessionLabel: string
  title: string
  titleMeta?: string
  value: number
  delta: number
  format: 'bytes' | 'duration' | 'number'
  subtitle?: string
  badges?: string[]
  stats?: SingleSideDiffStat[]
  ratioText?: string
}>(), {
  subtitle: '',
  titleMeta: '',
  badges: () => [],
  stats: () => [],
  ratioText: '',
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
      <span v-if="stats.length" flex="~ items-baseline gap-1" op55>
        <span>(</span>
        <template v-for="(stat, index) of stats" :key="stat.label">
          <span v-if="index" op70>|</span>
          <span font-mono font-600 :class="stat.tone === 'increase' ? 'text-green-500' : stat.tone === 'decrease' ? 'text-red-500' : 'op85'">{{ stat.value }}</span>
          <span>{{ stat.label }}</span>
        </template>
        <span>)</span>
      </span>
    </div>
  </div>
</template>
