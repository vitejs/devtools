<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <div class="p10 h-full flex flex-col items-center justify-center">
    <slot name="banner" />
    <div class="flex gap-2 animate-pulse items-center justify-center">
      <div class="i-svg-spinners-8-dots-rotate" />
      <span>{{ text ?? 'Loading...' }}</span>
    </div>
  </div>
</template>
