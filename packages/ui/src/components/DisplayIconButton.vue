<script setup lang="ts">
const props = defineProps<{
  title?: string
  classIcon?: string
  active?: boolean
}>()
</script>

<template>
  <button
    type="button"
    w-8 h-8 rounded-full flex items-center justify-center
    :class="props.active ? 'bg-active op90 text-green-400' : ''"
    hover="bg-active op100" op50 :title="props.title"
    :aria-label="props.title"
    :aria-pressed="props.active"
  >
    <slot><div :class="props.classIcon" /></slot>
  </button>
</template>
