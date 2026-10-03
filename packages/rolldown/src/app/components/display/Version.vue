<script setup lang="ts">
defineProps<{
  version?: string
  prefix?: string
}>()
</script>

<template>
  <span v-if="version" class="font-mono">{{ prefix || '' }}{{ version?.includes(':') ? version : `${prefix ? '' : 'v'}${version}` }}</span>
</template>
