<script setup lang="ts">
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
      :number="calls" icon="i-ph:arrow-counter-clockwise"
      color="transparent color-scale-neutral"
      :title="`Total calls: ${calls}`"
    />
    <span op40>|</span>
    <DisplayDuration
      :duration="duration" flex="~ gap-1 items-center" px1
      :title="`Total build cost: ${duration}ms`"
    >
      <span i-ph-clock-duotone inline-block />
    </DisplayDuration>
  </span>
</template>
