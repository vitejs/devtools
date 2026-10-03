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
    class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-active hover:op100 op50"
    :class="props.active ? 'bg-active op90 text-green-400' : ''" :title="props.title"
    :aria-label="props.title"
  >
    <slot><div :class="props.classIcon" /></slot>
  </button>
</template>
