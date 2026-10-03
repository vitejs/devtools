<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'

const props = defineProps<{
  timestamp: number | string
}>()
</script>

<template>
  <span v-if="timestamp">
    {{ formatTimeAgo(new Date(props.timestamp)) }}
  </span>
</template>
