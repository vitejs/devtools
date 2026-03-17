<script setup lang="ts">
import { computed } from 'vue'
import { getHashColorFromString } from './LogItemConstants'

const props = defineProps<{
  label: string
}>()

const style = computed(() => ({
  color: getHashColorFromString(props.label),
  backgroundColor: getHashColorFromString(props.label, 0.1),
}))
</script>

<template>
  <span class="text-xs px-1 rounded" :style="style">{{ label }}</span>
</template>
