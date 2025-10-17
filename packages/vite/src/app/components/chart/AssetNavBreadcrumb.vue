<script setup lang="ts">
import type { GraphBaseOptions } from 'nanovis'
import type { AssetChartInfo, AssetChartNode } from '~/types/chart'
import NavBreadcrumb from '~/components/chart/NavBreadcrumb.vue'

defineProps<{
  selected?: AssetChartNode
  options: GraphBaseOptions<AssetChartInfo | undefined>
}>()

const emit = defineEmits<{
  (e: 'select', node: AssetChartNode | null): void
}>()
</script>

<template>
  <NavBreadcrumb
    :selected="selected"
    :options="options"
    @select="emit('select', $event)"
  />
</template>
