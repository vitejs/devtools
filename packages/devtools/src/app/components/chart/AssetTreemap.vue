<script setup lang="ts">
import type { GraphBase, GraphBaseOptions, TreeNode } from 'nanovis'
import { useTemplateRef, watchEffect } from 'vue'

interface PackageNode {
}
type ChartNode = TreeNode<PackageNode | undefined>

const props = defineProps<{
  graph: GraphBase<PackageNode | undefined, GraphBaseOptions<PackageNode | undefined>>
  selected?: ChartNode | undefined
}>()

// const emit = defineEmits<{
//   (e: 'select', node: ChartNode | null): void
// }>()

const el = useTemplateRef<HTMLDivElement>('el')
watchEffect(() => el.value?.append(props.graph.el))
</script>

<template>
  <div ref="el" />
</template>
