<script setup lang="ts">
import { formatDuration } from '../../utils/format'
import DisplayDuration from '../Display/DisplayDuration.vue'
import DisplayNumberBadge from '../Display/DisplayNumberBadge.vue'

defineProps<{
  modules: number
  calls: number
  duration: number | undefined
}>()
</script>

<template>
  <span class="op50 text-xs flex justify-center items-center">
    <DisplayNumberBadge
      :number="modules" icon="i-catppuccin-java-class-abstract"
      color="transparent color-scale-neutral"
      :title="`Module processed: ${modules}`"
    />
    <span class="op40">|</span>
    <DisplayNumberBadge
      :number="calls" icon="i-ph-arrow-counter-clockwise"
      color="transparent color-scale-neutral"
      :title="`Total calls: ${calls}`"
    />
    <span class="op40">|</span>
    <DisplayDuration
      :duration="duration" class="flex gap-1 items-center px1"
      :title="`Total build cost: ${formatDuration(duration, true)}`"
    >
      <span class="i-ph-clock-duotone inline-block" />
    </DisplayDuration>
  </span>
</template>
