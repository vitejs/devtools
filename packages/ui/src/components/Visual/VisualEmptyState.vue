<script setup lang="ts">
// Centered empty-state placeholder: an optional icon (pass a UnoCSS icon class
// such as `i-ph-folder-simple-duotone`), a title, and a description. Richer
// descriptions can go through the `#description` slot or the default slot.
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py12 text-center">
    <div v-if="icon" :class="icon" class="text-4xl op-fade" />
    <div v-if="title" class="text-lg font-medium">
      {{ title }}
    </div>
    <p v-if="description" class="text-sm op-fade">
      {{ description }}
    </p>
    <slot name="description" />
    <slot />
  </div>
</template>
