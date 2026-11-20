<script setup lang="ts">
import type { StepCache } from '../../shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import { computed } from 'vue'
import { cacheChangeHue, cacheLabel } from '../utils/task-plan'

const props = defineProps<{ status?: StepCache['status'] }>()
const label = computed(() => cacheLabel(props.status))
const statusClass = computed(() => {
  switch (props.status) {
    case 'hit': return 'badge-color-gray op75'
    case 'error': return 'badge-color-red'
    case 'changed': return undefined
    default: return 'bg-active'
  }
})
</script>

<template>
  <DisplayBadge v-if="label" :text="status" :color="status === 'changed' ? cacheChangeHue(status) : false" :class="statusClass">
    {{ label }}
  </DisplayBadge>
</template>
