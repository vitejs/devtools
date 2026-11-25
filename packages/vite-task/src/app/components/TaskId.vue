<script setup lang="ts">
import DisplayHighlightedPath from '@vitejs/devtools-ui/components/Display/DisplayHighlightedPath'
import { getPluginColor } from '@vitejs/devtools-ui/utils/color'
import { computed, inject } from 'vue'
import { getTaskPackageKey } from '../utils/task-plan'

const props = defineProps<{ id: string, fallbackPackage?: string }>()
const separator = computed(() => props.id.lastIndexOf('#'))
const prefix = computed(() => props.id.slice(0, separator.value))
const getTaskPackage = inject(getTaskPackageKey)
const packageName = computed(() => getTaskPackage?.(props.id) ?? props.fallbackPackage ?? (separator.value >= 0 ? prefix.value : undefined))
const packageStyle = computed(() => packageName.value ? { color: getPluginColor(packageName.value) } : undefined)
</script>

<template>
  <span class="font-mono" :title="id">
    <template v-if="separator >= 0">
      <span :style="packageStyle"><DisplayHighlightedPath :path="prefix" /></span><span class="op50">#</span><span>{{ id.slice(separator + 1) }}</span>
    </template>
    <span v-else :style="packageStyle">{{ id }}</span>
  </span>
</template>
