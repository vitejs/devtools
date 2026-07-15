<script setup lang="ts">
import type { ModuleGraphLink, ModuleGraphNode } from '@vitejs/devtools-ui/composables/module-graph'
import type { ViteModuleImport, ViteModuleListItem } from '~/types/modules'
import DisplayModuleGraph from '@vitejs/devtools-ui/components/DisplayModuleGraph.vue'
import { createModuleGraph, getModuleGraphSize } from '@vitejs/devtools-ui/composables/module-graph'
import { computed, nextTick, unref } from 'vue'

const props = defineProps<{
  modules: ViteModuleListItem[]
  root: string
}>()

const modules = computed(() => props.modules)
const DEFAULT_EXPANDED_DEPTH = 3
const DEFAULT_EXPANDED_SIBLINGS = 10

createModuleGraph<ViteModuleListItem, ViteModuleImport>({
  modules,
  spacing: {
    width: 400,
    height: 55,
    linkOffset: 20,
    margin: 800,
    gap: 150,
  },
  generateGraph: (options) => {
    const { isFirstCalculateGraph, spacing, tree, hierarchy, collapsedNodes, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap, focusOn } = options
    const rootModules = computed(() => {
      const roots = modules.value.filter((module) => {
        return !module.importers.some(importer => modulesMap.value.has(importer))
      })
      return roots.length ? roots : modules.value
    })

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

    function createNode(module: ViteModuleListItem, depth: number, moduleImport?: ViteModuleImport, siblingIndex = 0): ModuleGraphNode<ViteModuleListItem, ViteModuleImport> {
      const defaultCollapsed = depth >= DEFAULT_EXPANDED_DEPTH || siblingIndex >= DEFAULT_EXPANDED_SIBLINGS
      if (isFirstCalculateGraph.value && defaultCollapsed && module.imports.length > 0) {
        collapsedNodes.add(module.id)
      }

      return {
        module,
        import: moduleImport,
        depth,
        expanded: !collapsedNodes.has(module.id),
        hasChildren: false,
      }
    }

    return (focusOnFirstRootNode = true) => {
      width.value = window.innerWidth
      height.value = window.innerHeight

      const seen = new Set<ViteModuleListItem>()
      const root = hierarchy<ModuleGraphNode<ViteModuleListItem, ViteModuleImport>>(
        { module: { id: '~root' } } as any,
        (parent) => {
          if (parent.module.id === '~root') {
            rootModules.value.forEach((x) => {
              seen.add(x)
              registerChildParent(x.id, '~root')
            })
            return rootModules.value.map((x, index) => createNode(x, 1, undefined, index))
          }

          if (collapsedNodes.has(parent.module.id)) {
            return []
          }

          const depth = (parent.depth ?? 0) + 1
          const childNodes: ModuleGraphNode<ViteModuleListItem, ViteModuleImport>[] = []
          for (const moduleImport of parent.module.imports) {
            const module = modulesMap.value.get(moduleImport.module_id)
            if (!module || seen.has(module))
              continue

            // Check if the module is a child of the current parent
            if (!registerChildParent(module.id, parent.module.id))
              continue

            seen.add(module)
            childNodes.push(createNode(module, depth, moduleImport, childNodes.length))
          }

          return childNodes
        },
      )

      if (isFirstCalculateGraph.value) {
        isFirstCalculateGraph.value = false
      }

      // Calculate the layout
      const layout = tree<ModuleGraphNode<ViteModuleListItem, ViteModuleImport>>()
        .nodeSize([unref(spacing.height), unref(spacing.width) + unref(spacing.gap)])
      layout(root)

      const _nodes = root.descendants()

      for (const node of _nodes) {
        // Rotate the graph from top-down to left-right
        [node.x, node.y] = [node.y! - unref(spacing.width), node.x!]

        if (node.data.module.imports) {
          node.data.hasChildren = node.data.module.imports
            ?.some((subNode) => {
              const parentId = childToParentMap.get(subNode.module_id)
              return modulesMap.value.has(subNode.module_id) && (!parentId || parentId === node.data.module.id)
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
        nodesMap.set(node.data.module.id, node)
      }
      const _links = root.links()
        .filter(x => x.source.data.module.id !== '~root')
        .map((x): ModuleGraphLink<ViteModuleListItem, ViteModuleImport> => {
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

      const graphSize = getModuleGraphSize(_nodes, spacing)
      width.value = graphSize.width
      height.value = graphSize.height

      nextTick(() => {
        const moduleId = rootModules.value?.[0]?.id
        if (focusOnFirstRootNode && moduleId) {
          nextTick(() => {
            focusOn(moduleId, false)
          })
        }
      })
    }
  },
})
</script>

<template>
  <DisplayModuleGraph
    :modules="modules"
  >
    <template #default="{ node, nodesRefMap }">
      <DisplayModuleId
        :id="node.data.module.id"
        :ref="(el: any) => nodesRefMap.set(node.data.module.id, el?.$el)"
        :link="true"
        :cwd="root"
        :minimal="true"
        flex="1"
      />
    </template>
    <template #link="{ link, d, linkClass }">
      <path
        :d="d"
        :class="linkClass"
        :stroke-dasharray="link.import?.kind === 'dynamic-import' ? '3 6' : undefined"
        fill="none"
      />
    </template>
  </DisplayModuleGraph>
</template>
