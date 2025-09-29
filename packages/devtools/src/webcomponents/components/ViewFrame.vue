<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'

const props = defineProps<{
  entry: DevToolsDockEntry
}>()
</script>

<template>
  <div>
    <!-- TODO: -->
    Hello
    <slot />
  </div>
</template>
