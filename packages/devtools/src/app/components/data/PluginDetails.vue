<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'

defineProps<{
  session: SessionContext
}>()
</script>

<template>
  <div flex="~ col gap-3">
    Detail
  </div>
</template>
