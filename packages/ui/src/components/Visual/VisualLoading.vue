<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <div p10 h-full flex="~ col" items-center justify-center>
    <slot name="banner" />
    <div flex="~ gap-2" animate-pulse items-center justify-center>
      <div i-svg-spinners-8-dots-rotate />
      <span>{{ text ?? 'Loading...' }}</span>
    </div>
  </div>
</template>
