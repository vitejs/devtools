<script setup lang="ts">
const props = defineProps<{
  text?: string
}>()
</script>

<template>
  <div p10 h-full flex="~ col" items-center justify-center>
    <VisualLogoBanner />
    <div flex="~ gap-2" animate-pulse mt--4 items-center justify-center>
      <div i-svg-spinners-8-dots-rotate />
      <span>{{ props.text ?? 'Loading...' }}</span>
    </div>
  </div>
</template>
