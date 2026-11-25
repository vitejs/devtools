<script setup lang="ts">
import type { ModuleGraphNode } from '@vitejs/devtools-ui/composables/module-graph'
import type { TaskGraph } from '../../shared/types'
import DisplayHighlightedPath from '@vitejs/devtools-ui/components/Display/DisplayHighlightedPath'
import DisplayModuleGraph from '@vitejs/devtools-ui/components/Display/DisplayModuleGraph.vue'
import { createModuleGraph, getModuleGraphSize } from '@vitejs/devtools-ui/composables/module-graph'
import { getPluginColor } from '@vitejs/devtools-ui/utils/color'
import { computed, nextTick, unref } from 'vue'

const props = defineProps<{
  graph: TaskGraph
  matched: Set<string>
  selected: string
  disabled?: boolean
}>()
defineEmits<{ select: [id: string] }>()

const taskNodes = computed(() => Object.entries(props.graph.tasks).map(([id, task]) => ({
  id,
  name: task.name,
  package: task.package,
  imports: (task.dependsOn || []).filter(dep => props.graph.tasks[dep]).map(module_id => ({ module_id })),
})))
type TaskNode = typeof taskNodes.value[number]
type TaskDependency = TaskNode['imports'][number]

createModuleGraph<TaskNode, TaskDependency>({
  modules: taskNodes,
  spacing: { width: 200, height: 52, linkOffset: 20, margin: 800, gap: 70 },
  generateGraph: ({ hierarchy, tree, spacing, nodes, links, nodesMap, linksMap, width, height, container, scale }) => {
    return (focus = true) => {
      // Use the same D3 tree layout as Vite. The forest positions nodes only;
      // edges below retain every dependency, including shared and cyclic ones.
      const byId = new Map(taskNodes.value.map(task => [task.id, task]))
      const dependencyIds = new Set(taskNodes.value.flatMap(task => task.imports.map(dep => dep.module_id)))
      const seen = new Set<string>()
      interface Branch extends ModuleGraphNode<TaskNode, TaskDependency> {
        children: Branch[]
      }
      function branch(task: TaskNode): Branch {
        seen.add(task.id)
        const children: Branch[] = []
        for (const dep of task.imports) {
          if (!seen.has(dep.module_id))
            children.push(branch(byId.get(dep.module_id)!))
        }
        return { module: task, hasChildren: false, children }
      }
      const forest: Branch[] = []
      for (const task of [...taskNodes.value.filter(task => !dependencyIds.has(task.id)), ...taskNodes.value]) {
        if (!seen.has(task.id))
          forest.push(branch(task))
      }
      const root = hierarchy<ModuleGraphNode<TaskNode, TaskDependency>>({
        module: { id: '~root', name: '', package: '', imports: [] },
        children: forest,
      } as Branch, item => (item as Branch).children)
      tree<ModuleGraphNode<TaskNode, TaskDependency>>().nodeSize([unref(spacing.height), unref(spacing.width) + unref(spacing.gap)])(root)
      const descendants = root.descendants().filter(node => node !== root)
      const minY = Math.min(0, ...descendants.map(node => node.x!))
      for (const node of descendants) {
        const vertical = node.x!
        node.x = node.y! + unref(spacing.margin)
        node.y = vertical - minY + unref(spacing.margin)
      }
      nodes.value = descendants
      nodesMap.clear()
      for (const node of nodes.value)
        nodesMap.set(node.data.module.id, node)
      links.value = taskNodes.value.flatMap(task => task.imports.map(dep => ({
        id: JSON.stringify([task.id, dep.module_id]),
        source: nodesMap.get(task.id)!,
        target: nodesMap.get(dep.module_id)!,
        import: dep,
      })))
      linksMap.clear()
      for (const link of links.value)
        linksMap.set(link.id, link)
      const size = getModuleGraphSize(nodes.value, spacing)
      width.value = size.width
      height.value = size.height
      if (focus && nodes.value.length) {
        nextTick(() => {
          const el = container.value
          const xs = nodes.value.map(node => node.x!)
          const ys = nodes.value.map(node => node.y!)
          const graphWidth = Math.max(...xs) - Math.min(...xs) + unref(spacing.width)
          const graphHeight = Math.max(...ys) - Math.min(...ys) + unref(spacing.height)
          const fitScale = Math.min(1, (el.clientWidth - 60) / graphWidth, (el.clientHeight - 60) / graphHeight)
          scale.value = Math.max(0.8, fitScale)
          nextTick(() => el.scrollTo({
            left: fitScale >= 0.8
              ? (Math.min(...xs) + Math.max(...xs)) / 2 * scale.value - el.clientWidth / 2
              : (Math.min(...xs) - unref(spacing.width) / 2) * scale.value - 30,
            top: fitScale >= 0.8
              ? (Math.min(...ys) + Math.max(...ys)) / 2 * scale.value - el.clientHeight / 2
              : (Math.min(...ys) - unref(spacing.height) / 2) * scale.value - 30,
          }))
        })
      }
    }
  },
})
</script>

<template>
  <DisplayModuleGraph v-if="taskNodes.length" :modules="taskNodes" :expand-controls="false" class="h-full!">
    <template #link="{ link, d, linkClass }">
      <path :d="d" :class="[linkClass, { 'op-fade': !matched.has(link.source.data.module.id) && !matched.has(link.target.data.module.id) }]" fill="none" />
    </template>
    <template #default="{ node, nodesRefMap }">
      <button
        :ref="(el: any) => nodesRefMap.set(node.data.module.id, el)"
        class="w-full min-w-0 flex items-center gap1 text-sm text-left font-mono"
        :class="{ 'color-active': selected === node.data.module.id, 'op-fade': !matched.has(node.data.module.id) }"
        :title="node.data.module.id" :disabled="disabled" :aria-pressed="selected === node.data.module.id"
        @click="$emit('select', node.data.module.id)"
      >
        <span class="min-w-0 truncate" :style="{ color: getPluginColor(node.data.module.package) }"><DisplayHighlightedPath :path="node.data.module.package === '.' ? 'root' : node.data.module.package" /></span>
        <span class="op-fade">/</span>
        <span class="shrink-0">{{ node.data.module.name }}</span>
      </button>
    </template>
  </DisplayModuleGraph>
  <div v-else class="w-full h-48 flex items-center justify-center text-sm op50 italic">
    <p>No tasks</p>
  </div>
</template>
