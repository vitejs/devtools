<script setup lang="ts">
// Styled checkbox bound through a two-way model. The native input keeps
// keyboard and a11y semantics; `accent-primary-500` tints it with the host's
// brand color. An optional `label` (or the default slot) sits beside it.
defineProps<{
  label?: string
}>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label inline-flex items-center gap-2 cursor-pointer select-none>
    <input
      v-model="model"
      type="checkbox"
      w-4 h-4 accent-primary-500 cursor-pointer
    >
    <span v-if="label" text-sm>{{ label }}</span>
    <slot />
  </label>
</template>
