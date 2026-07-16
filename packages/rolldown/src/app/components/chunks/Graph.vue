<script setup lang="ts">
import type { ChunkImport } from '@rolldown/debug'
import type { ModuleGraphLink, ModuleGraphNode } from '@vitejs/devtools-ui/composables/module-graph'
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types/data'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayModuleGraph from '@vitejs/devtools-ui/components/Display/DisplayModuleGraph.vue'
import { createModuleGraph, getModuleGraphSize } from '@vitejs/devtools-ui/composables/module-graph'
import { computed, unref } from 'vue'
import { useRoute } from '#app/composables/router'

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
const DEFAULT_EXPANDED_DEPTH = 3
const DEFAULT_EXPANDED_SIBLINGS = 10

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
    const { isFirstCalculateGraph, spacing, tree, hierarchy, collapsedNodes, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap } = options

    function registerChildParent(moduleId: string, parentId: string) {
      const existingParentId = childToParentMap.get(moduleId)
      if (existingParentId && existingParentId !== parentId) {
        return false
      }
      if (!existingParentId) {
        childToParentMap.set(moduleId, parentId)
      }
      return true
    }

    function createNode(module: ChunkInfo, depth: number, chunkImport?: ChunkImport, siblingIndex = 0): ModuleGraphNode<ChunkInfo, ChunkImport> {
      const defaultCollapsed = depth >= DEFAULT_EXPANDED_DEPTH || siblingIndex >= DEFAULT_EXPANDED_SIBLINGS
      if (isFirstCalculateGraph.value && defaultCollapsed && module.imports.length > 0) {
        collapsedNodes.add(module.id)
      }

      return {
        module,
        import: chunkImport,
        depth,
        expanded: !collapsedNodes.has(module.id),
        hasChildren: false,
      }
    }

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
              registerChildParent(x.id, '~root')
            })
            return entryChunks.map((x, index) => createNode(x, 1, undefined, index))
          }

          if (collapsedNodes.has(`${parent.module?.id}`)) {
            return []
          }

          const depth = (parent.depth ?? 0) + 1
          const childNodes: ModuleGraphNode<ChunkInfo, ChunkImport>[] = []
          for (const chunkImport of parent.module.imports) {
            const module = modulesMap.value.get(`${chunkImport.chunk_id}`)
            if (!module || seen.has(module))
              continue

            if (!registerChildParent(module.id, parent.module.id))
              continue

            seen.add(module)
            childNodes.push(createNode(module, depth, chunkImport, childNodes.length))
          }

          return childNodes
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
          node.data.hasChildren = node.data.module.imports
            ?.some((chunkImport) => {
              const chunkId = `${chunkImport.chunk_id}`
              const parentId = childToParentMap.get(chunkId)
              return modulesMap.value.has(chunkId) && (!parentId || parentId === node.data.module.id)
            })
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
            id: `${x.source.data.module.id}|${x.target.data.module.id}`,
          }
        })

      const linkIds = new Set(_links.map(link => link.id))
      const _additionalLinks: ModuleGraphLink<ChunkInfo, ChunkImport>[] = []
      for (const chunk of chunks.value) {
        const source = nodesMap.get(`${chunk.chunk_id}`)
        if (!source)
          continue

        for (const chunkImport of chunk.imports) {
          const id = `${chunk.chunk_id}|${chunkImport.chunk_id}`
          const target = nodesMap.get(`${chunkImport.chunk_id}`)
          if (!target || linkIds.has(id))
            continue

          _additionalLinks.push({
            source,
            target,
            import: chunkImport,
            id,
          })
          linkIds.add(id)
        }
      }

      const normalizedLinks = [..._links, ..._additionalLinks]

      linksMap.clear()
      for (const link of normalizedLinks) {
        linksMap.set(link.id, link)
      }
      links.value = normalizedLinks

      const graphSize = getModuleGraphSize(_nodes, spacing)
      width.value = graphSize.width
      height.value = graphSize.height
    }
  },
})
</script>

<template>
  <DisplayModuleGraph
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
