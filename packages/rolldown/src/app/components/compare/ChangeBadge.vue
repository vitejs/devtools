<script setup lang="ts">
import type { SessionCompareChangeStatus } from '~~/shared/types'
import { computed } from 'vue'

const props = defineProps<{
  status: SessionCompareChangeStatus
}>()

const badge = computed(() => {
  switch (props.status) {
    case 'added':
      return {
        label: 'Added',
        icon: 'i-ph-plus-circle-duotone',
        class: 'text-red-500 bg-red-500/10',
      }
    case 'removed':
      return {
        label: 'Removed',
        icon: 'i-ph-minus-circle-duotone',
        class: 'text-green-500 bg-green-500/10',
      }
    case 'changed':
      return {
        label: 'Changed',
        icon: 'i-ph-arrows-clockwise-duotone',
        class: 'text-amber-500 bg-amber-500/10',
      }
    default:
      return {
        label: 'Unchanged',
        icon: 'i-ph-check-circle-duotone',
        class: 'text-gray-500 bg-gray-500/10',
      }
  }
})
</script>

<template>
  <span
    inline-flex items-center gap-1 rounded px2 py1 text-xs font-500
    :class="badge.class"
  >
    <span :class="badge.icon" />
    {{ badge.label }}
  </span>
</template>
