<script setup lang="ts">
import { computed } from 'vue'
import { bytesToHumanSize } from '~/utils/format'

const props = defineProps<{
  name: string
  description: string
  icon: string
  current: number
  previous: number
  format?: string
}>()

const formattedCurrent = computed(() => {
  if (props.format === 'bytes')
    return bytesToHumanSize(props.current)
  return props.current
})
</script>

<template>
  <div font-500 op50 text-4 flex="~ items-center gap-2" :title="description">
    <div :class="icon" class="text-xl" />
    {{ name }}
  </div>
  <div flex="~ gap-2" items-center>
    <div v-if="format === 'bytes'">
      <span font-semibold text-5 font-mono>{{ (formattedCurrent as Array<number | string>)[0] }}</span>
      <span font-semibold text-4 font-mono>{{ (formattedCurrent as Array<number | string>)[1] }}</span>
    </div>
    <div v-else>
      <span font-semibold text-5 font-mono>{{ formattedCurrent }}</span>
    </div>
    <DisplayComparisonMetric :current="current" :previous="previous" />
  </div>
</template>
