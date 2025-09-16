<script setup lang="ts">
import type { Chunk, ChunkImport } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types/data'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import { useRoute } from '#app/composables/router'
import { computed, nextTick, unref } from 'vue'
import { createModuleGraph } from '~/composables/moduleGraph'

const props = defineProps<{
  session: SessionContext
  chunks: ChunkInfo[]
}>()

const chunks = computed(() => props.chunks)
const route = useRoute()

type ChunkInfo = Chunk & {
  id: string
}
createModuleGraph<ChunkInfo, ChunkImport>({
  modules: chunks,
  spacing: {
    width: 320,
    height: 55,
    linkOffset: 15,
    margin: 120,
    gap: 80,
  },
  generateGraph: (options) => {
    const { isFirstCalculateGraph, scale, spacing, tree, hierarchy, collapsedNodes, container, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap } = options
    return () => {
      width.value = window.innerWidth
      height.value = window.innerHeight

      const root = hierarchy<ModuleGraphNode<ChunkInfo, ChunkImport> & { end?: boolean }>(
        { module: { id: '~root' } } as any,
        (parent) => {
          if (`${parent.module?.id}` === '~root') {
            chunks.value.forEach((x) => {
              if (isFirstCalculateGraph.value) {
                childToParentMap.set(x.id, '~root')
              }
            })
            return chunks.value.map(x => ({
              module: x,
              expanded: !collapsedNodes.has(x.id),
              hasChildren: false,
            }))
          }

          if (collapsedNodes.has(`${parent.module?.id}`) || parent.end) {
            return []
          }

          const nodes = parent.module.imports
            .map((x): ModuleGraphNode<ChunkInfo, ChunkImport> & { end: boolean } | undefined => {
              const module = modulesMap.value.get(`${x.chunk_id}`)
              if (!module)
                return undefined

              if (isFirstCalculateGraph.value) {
                childToParentMap.set(module.id, parent.module.id)
              }

              return {
                module,
                import: x,
                expanded: !collapsedNodes.has(module.id),
                hasChildren: false,
                end: true,
              }
            })
            .filter(x => x !== undefined)

          return nodes
        },
      )

      if (isFirstCalculateGraph.value) {
        isFirstCalculateGraph.value = false
      }

      // Calculate the layout
      const layout = tree<ModuleGraphNode<ChunkInfo, ChunkImport> & { end?: boolean }>()
        .nodeSize([unref(spacing.height), unref(spacing.width) + unref(spacing.gap)])
      layout(root)

      const _nodes = root.descendants()

      for (const node of _nodes) {
        // Rotate the graph from top-down to left-right
        [node.x, node.y] = [node.y! - unref(spacing.width), node.x!]

        if (node.data.module.imports) {
          node.data.hasChildren = node.data.module.imports.length > 0 && !node.data.end
        }
      }

      // Offset the graph and adding margin
      const minX = Math.min(..._nodes.map(n => n.x!))
      const minY = Math.min(..._nodes.map(n => n.y!))
      if (minX < unref(spacing.margin)) {
        for (const node of _nodes) {
          node.x! += Math.abs(minX) + unref(spacing.margin)
        }
      }
      if (minY < unref(spacing.margin)) {
        for (const node of _nodes) {
          node.y! += Math.abs(minY) + unref(spacing.margin)
        }
      }

      nodes.value = _nodes
      nodesMap.clear()
      for (const node of _nodes) {
        nodesMap.set(`${node.data.module.id}`, node)
      }
      const _links = root.links()
        .filter(x => `${x.source.data.module.id}` !== '~root')
        .map((x): ModuleGraphLink<ChunkInfo, ChunkImport> => {
          return {
            ...x,
            import: x.source.data.import,
            id: `${x.source.data.module.id}|${x.target.data.module.id}`,
          }
        })
      linksMap.clear()
      for (const link of _links) {
        linksMap.set(link.id, link)
      }
      links.value = _links

      nextTick(() => {
        width.value = (container.value!.scrollWidth / scale.value + unref(spacing.margin))
        height.value = (container.value!.scrollHeight / scale.value + unref(spacing.margin))
      })
    }
  },
})
</script>

<template>
  <DisplayModuleGraph
    :session="session"
    :modules="chunks"
  >
    <template #default="{ node }">
      <NuxtLink class="flex items-center" :to="{ path: route.path, query: { chunk: node.data.module.chunk_id } }">
        <span op50 font-mono w12>#{{ node.data.module.id }}</span>
        <div flex="~ gap-2 items-center" :title="`Chunk #${node.data.module.id}`">
          <div i-ph-shapes-duotone />
          <div>{{ node.data.module.name || '[unnamed]' }}</div>
          <DisplayBadge :text="node.data.module.reason" />
        </div>
        <div flex-auto />
        <div flex="~ gap-1 items-center">
          <div i-ph-package-duotone />
          {{ node.data.module.modules.length }}
        </div>
      </NuxtLink>
    </template>
  </DisplayModuleGraph>
</template>
