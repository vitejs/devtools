<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import { computed } from 'vue'

interface SplitDiffStat {
  value: string
  label: string
  tone?: 'increase' | 'decrease'
  hidden?: boolean
}

const props = withDefaults(defineProps<{
  previousTitle?: string
  currentTitle?: string
  previousTitleMeta?: string
  currentTitleMeta?: string
  previousSubtitle?: string
  currentSubtitle?: string
  previousStats?: SplitDiffStat[]
  currentStats?: SplitDiffStat[]
  previousBadges?: string[]
  currentBadges?: string[]
  previous: number
  current: number
  delta: number
  format: 'bytes' | 'duration' | 'number'
  ratioText?: string
}>(), {
  previousStats: () => [],
  currentStats: () => [],
  previousBadges: () => [],
  currentBadges: () => [],
  ratioText: '',
})

const ratioClass = computed(() => {
  if (props.delta > 0)
    return 'text-red-500'
  if (props.delta < 0)
    return 'text-green-500'
  return 'text-gray-500'
})
</script>

<template>
  <div border="~ base rounded" of-hidden hover="bg-active">
    <div border="b base" bg-base p3 flex="~ items-center justify-end">
      <div flex="~ items-center gap-2 wrap justify-end">
        <CompareDeltaValue :value="delta" :format="format" signed />
        <span v-if="ratioText" rounded bg-active px2 py0.5 font-mono text-xs :class="ratioClass">
          {{ ratioText }}
        </span>
      </div>
    </div>

    <div grid="~ cols-2" min-h-30>
      <div p4 min-w-0 flex="~ col gap-3 justify-between" :class="{ op35: !previousTitle }">
        <template v-if="previousTitle">
          <div min-w-0>
            <div flex="~ items-center gap-2" text-xs op50 mb2>
              <span i-ph-clock-counter-clockwise-duotone />
              Session A
            </div>
            <div flex="~ items-baseline gap-2" min-w-0 font-mono font-600 :title="previousTitleMeta ? `${previousTitle} (${previousTitleMeta})` : previousTitle">
              <span truncate>{{ previousTitle }}</span>
              <span v-if="previousTitleMeta" flex-none font-400 op50>({{ previousTitleMeta }})</span>
            </div>
            <div v-if="previousSubtitle" truncate text-xs op50 mt1 :title="previousSubtitle">
              {{ previousSubtitle }}
            </div>
          </div>
          <div flex="~ items-end gap-3 justify-between">
            <div min-w-0 flex="~ items-center gap-2 wrap">
              <DisplayBadge v-for="badge of previousBadges" :key="badge" :text="badge" />
              <CompareStatsStrip :stats="previousStats" />
            </div>
            <span text-lg font-600>
              <CompareDeltaValue :value="previous" :format="format" />
            </span>
          </div>
        </template>
        <div v-else h-full min-h-16 flex="~ items-center justify-center" text-sm italic op60>
          Not present
        </div>
      </div>

      <div border="l base" p4 min-w-0 flex="~ col gap-3 justify-between" :class="{ op35: !currentTitle }">
        <template v-if="currentTitle">
          <div min-w-0>
            <div flex="~ items-center gap-2" text-xs op50 mb2>
              <span i-ph-clock-duotone />
              Session B
            </div>
            <div flex="~ items-baseline gap-2" min-w-0 font-mono font-600 :title="currentTitleMeta ? `${currentTitle} (${currentTitleMeta})` : currentTitle">
              <span truncate>{{ currentTitle }}</span>
              <span v-if="currentTitleMeta" flex-none font-400 op50>({{ currentTitleMeta }})</span>
            </div>
            <div v-if="currentSubtitle" truncate text-xs op50 mt1 :title="currentSubtitle">
              {{ currentSubtitle }}
            </div>
          </div>
          <div flex="~ items-end gap-3 justify-between">
            <div min-w-0 flex="~ items-center gap-2 wrap">
              <DisplayBadge v-for="badge of currentBadges" :key="badge" :text="badge" />
              <CompareStatsStrip :stats="currentStats" />
            </div>
            <span text-lg font-600>
              <CompareDeltaValue :value="current" :format="format" />
            </span>
          </div>
        </template>
        <div v-else h-full min-h-16 flex="~ items-center justify-center" text-sm italic op60>
          Not present
        </div>
      </div>
    </div>
  </div>
</template>
