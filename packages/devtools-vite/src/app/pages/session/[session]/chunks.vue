<script setup lang="ts">
import type { Chunk, ChunkImport } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types/data'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import type { ClientSettings } from '~/state/settings'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed, nextTick, unref } from 'vue'
import { createModuleGraph } from '~/composables/moduleGraph'
import { settings } from '~/state/settings'

type ChunkInfo = Chunk & {
  id: string
}

const props = defineProps<{
  session: SessionContext
}>()

const chunkViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-carbon-list',
  },
  {
    label: 'Graph',
    value: 'graph',
    icon: 'i-ph-graph-duotone',
  },
] as const

const rpc = useRpc()
const { state: chunks, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-chunks-graph']?.({
      session: props.session.id,
    })
  },
  null,
)
const normalizedChunks = computed(() => chunks.value?.map(x => ({
  ...x,
  id: `${x.chunk_id}`,
})) ?? [])

function toggleDisplay(type: ClientSettings['chunkViewType']) {
  settings.value.chunkViewType = type
}

createModuleGraph<ChunkInfo, ChunkImport>({
  modules: normalizedChunks,
  spacing: {
    width: 320,
    height: 55,
    linkOffset: 15,
    margin: 120,
    gap: 80,
  },
  generateGraph: (options) => {
    const { isFirstCalculateGraph, scale, spacing, tree, hierarchy, collapsedNodes, container, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap } = options
    const rootNodes = computed(() => normalizedChunks.value)
    return () => {
      width.value = window.innerWidth
      height.value = window.innerHeight

      const root = hierarchy<ModuleGraphNode<ChunkInfo, ChunkImport> & { end?: boolean }>(
        { module: { id: '~root' } } as any,
        (parent) => {
          if (`${parent.module?.id}` === '~root') {
            rootNodes.value.forEach((x) => {
              if (isFirstCalculateGraph.value) {
                childToParentMap.set(x.id, '~root')
              }
            })
            return rootNodes.value.map(x => ({
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
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <div flex="~ gap-2 items-center" p2 border="~ base rounded-xl" bg-glass>
        <span op50 pl2 text-sm>View as</span>
        <button
          v-for="viewType of chunkViewTypes"
          :key="viewType.value"
          btn-action
          :class="settings.chunkViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
          @click="toggleDisplay(viewType.value)"
        >
          <div :class="viewType.icon" />
          {{ viewType.label }}
        </button>
      </div>
    </div>
    <template v-if="settings.chunkViewType === 'list'">
      <div class="px5 pt24" flex="~ col gap-4">
        <template v-for="chunk of chunks" :key="chunk.id">
          <DataChunkDetails
            border="~ base rounded-lg"
            p3
            :chunk="chunk"
            :session="session"
          />
        </template>
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'graph'">
      <DisplayModuleGraph
        :session="session"
        :modules="normalizedChunks"
      >
        <template #default="{ node }">
          <div flex="~ items-center">
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
          </div>
        </template>
      </DisplayModuleGraph>
    </template>
  </div>
</template>
