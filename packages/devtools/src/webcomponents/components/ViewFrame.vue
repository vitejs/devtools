<script setup lang="ts">
import type { DevtoolsViewTab } from '@vitejs/devtools-kit'

const props = defineProps<{
  view: DevtoolsViewTab
}>()
</script>

<template>
  <div>
    <!-- TODO: -->
    <slot />
  </div>
</template>
