<script setup lang="ts">
import DisplayDuration from '@vitejs/devtools-ui/components/DisplayDuration.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/DisplayNumberBadge.vue'
import { formatDuration } from '@vitejs/devtools-ui/utils/format'

defineProps<{
  modules: number
  calls: number
  duration: number | undefined
}>()
</script>

<template>
  <span op50 text-xs flex justify-center items-center>
    <DisplayNumberBadge
      :number="modules" icon="i-catppuccin-java-class-abstract"
      color="transparent color-scale-neutral"
      :title="`Module processed: ${modules}`"
    />
    <span op40>|</span>
    <DisplayNumberBadge
      :number="calls" icon="i-ph-arrow-counter-clockwise"
      color="transparent color-scale-neutral"
      :title="`Total calls: ${calls}`"
    />
    <span op40>|</span>
    <DisplayDuration
      :duration="duration" flex="~ gap-1 items-center" px1
      :title="`Total build cost: ${formatDuration(duration, true)}`"
    >
      <span i-ph-clock-duotone inline-block />
    </DisplayDuration>
  </span>
</template>
