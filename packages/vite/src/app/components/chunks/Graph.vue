<script setup lang="ts">
import type { ChunkImport } from '@rolldown/debug'
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types/data'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import { useRoute } from '#app/composables/router'
import { computed, nextTick, unref } from 'vue'
import { createModuleGraph } from '~/composables/moduleGraph'

type ChunkInfo = RolldownChunkInfo & {
  id: string
}
const props = withDefaults(defineProps<{
  session: SessionContext
  chunks: ChunkInfo[]
  entryId?: string
}>(), {
  entryId: '',
})

const chunks = computed(() => props.chunks)
const route = useRoute()

createModuleGraph<ChunkInfo, ChunkImport>({
  modules: chunks,
  spacing: {
    width: 450,
    height: 55,
    linkOffset: 15,
    margin: 120,
    gap: 150,
  },
  generateGraph: (options) => {
    const { isFirstCalculateGraph, scale, spacing, tree, hierarchy, collapsedNodes, container, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap } = options
    return () => {
      width.value = window.innerWidth
      height.value = window.innerHeight

      const entryChunks = chunks.value.filter(chunk => props.entryId ? chunk.id === props.entryId : chunk.reason === 'entry')

      const seen = new Set<ChunkInfo>()
      const root = hierarchy<ModuleGraphNode<ChunkInfo, ChunkImport>>(
        { module: { id: '~root' } } as any,
        (parent) => {
          if (`${parent.module?.id}` === '~root') {
            entryChunks.forEach((x) => {
              seen.add(x)

              if (isFirstCalculateGraph.value) {
                childToParentMap.set(x.id, '~root')
              }
            })
            return entryChunks.map(x => ({
              module: x,
              expanded: !collapsedNodes.has(x.id),
              hasChildren: false,
            }))
          }

          if (collapsedNodes.has(`${parent.module?.id}`)) {
            return []
          }

          const nodes = parent.module.imports
            ?.map((x): ModuleGraphNode<ChunkInfo, ChunkImport> | undefined => {
              const module = modulesMap.value.get(`${x.chunk_id}`)
              if (!module || seen.has(module))
                return undefined

              if (isFirstCalculateGraph.value) {
                childToParentMap.set(module.id, parent.module.id)
              }

              seen.add(module)

              return {
                module,
                expanded: !collapsedNodes.has(module.id),
                hasChildren: false,
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
            id: `${x.source.data.module.id}|${x.target.data.module.id}`,
          }
        })

      const _additionalLinks = chunks.value.flatMap(chunk =>
        chunk.imports
          .filter(_import => !_links.find(x => x.id === `${chunk.chunk_id}|${_import.chunk_id}`))
          .map(_import => ({
            source: nodesMap.get(`${chunk.chunk_id}`)!,
            target: nodesMap.get(`${_import.chunk_id}`)!,
            id: `${chunk.chunk_id}|${_import.chunk_id}`,
          })),
      )

      const normalizedLinks = [..._links, ..._additionalLinks]

      linksMap.clear()
      for (const link of normalizedLinks) {
        linksMap.set(link.id, link)
      }
      links.value = normalizedLinks

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
    :expand-controls="false"
  >
    <template #default="{ node }">
      <NuxtLink class="flex items-center" :to="{ path: route.path, query: { chunk: node.data.module.chunk_id } }">
        <span op50 font-mono w12>#{{ node.data.module.id }}</span>
        <div flex="~ gap-2 items-center" :title="`Chunk #${node.data.module.id}`">
          <div>{{ node.data.module.name || '[unnamed]' }}</div>
          <DisplayBadge :text="node.data.module.reason" />
          <DisplayBadge v-if="node.data.module.is_initial" text="initial" />
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
