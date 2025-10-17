<script setup lang="ts">
import type { GraphBaseOptions } from 'nanovis'
import type { PackageChartInfo, PackageChartNode } from '~/types/chart'
import NavBreadcrumb from '~/components/chart/NavBreadcrumb.vue'

defineProps<{
  selected?: PackageChartNode
  options: GraphBaseOptions<PackageChartInfo | undefined>
}>()

const emit = defineEmits<{
  (e: 'select', node: PackageChartNode | null): void
}>()
</script>

<template>
  <NavBreadcrumb
    :selected="selected"
    :options="options"
    @select="emit('select', $event)"
  />
</template>
