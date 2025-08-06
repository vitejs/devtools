<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import type { AssetChartInfo, AssetChartNode } from '~/types/assets'
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps<{
  graph: GraphBase<AssetChartInfo | undefined, GraphBaseOptions<AssetChartInfo | undefined>>
  selected?: AssetChartNode | undefined
}>()

const emit = defineEmits<{
  (e: 'select', node: AssetChartNode | null): void
}>()

const el = useTemplateRef<HTMLDivElement>('el')
watchEffect(() => el.value?.append(props.graph.el))
</script>

<template>
  <ChartAssetNavBreadcrumb
    border="b base" py2 min-h-10
    :selected="selected"
    :options="graph.options"
    @select="emit('select', $event)"
  />
  <div ref="el" />
</template>
