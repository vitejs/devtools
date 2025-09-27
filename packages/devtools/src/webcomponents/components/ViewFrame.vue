<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'

const props = defineProps<{
  view: DevToolsDockEntry
}>()
</script>

<template>
  <div>
    <!-- TODO: -->
    <slot />
  </div>
</template>
