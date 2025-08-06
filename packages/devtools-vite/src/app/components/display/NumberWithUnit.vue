<script setup lang="ts">
defineProps<{
  number: number | string
  unit: string
}>()
</script>

<template>
  <div>
    <slot />
    <span>{{ number }}</span><span ml-0.4 text-xs op75>{{ unit }}</span>
  </div>
</template>
