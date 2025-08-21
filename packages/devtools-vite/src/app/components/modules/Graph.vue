<script setup lang="ts">
import type { ModuleImport, ModuleListItem, SessionContext } from '~~/shared/types'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import { computed, nextTick, unref } from 'vue'
import { createModuleGraph } from '~/composables/moduleGraph'

const props = defineProps<{
  modules: ModuleListItem[]
  session: SessionContext
}>()

const modules = computed(() => props.modules)

createModuleGraph<ModuleListItem, ModuleImport>({
  modules,
  spacing: {
    width: 400,
    height: 55,
    linkOffset: 20,
    margin: 800,
    gap: 150,
  },
  generateGraph: (options) => {
    const { isFirstCalculateGraph, scale, spacing, tree, hierarchy, collapsedNodes, container, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap, focusOn } = options
    const rootModules = computed(() => {
      return modules.value.filter(x => x.importers.length === 0)
    })

    return (focusOnFirstRootNode = true) => {
      width.value = window.innerWidth
      height.value = window.innerHeight

      const seen = new Set<ModuleListItem>()
      const root = hierarchy<ModuleGraphNode<ModuleListItem, ModuleImport>>(
        { module: { id: '~root' } } as any,
        (parent) => {
          if (parent.module.id === '~root') {
            rootModules.value.forEach((x) => {
              seen.add(x)

              if (isFirstCalculateGraph.value) {
                childToParentMap.set(x.id, '~root')
              }
            })
            return rootModules.value.map(x => ({
              module: x,
              expanded: !collapsedNodes.has(x.id),
              hasChildren: false,
            }))
          }

          if (collapsedNodes.has(parent.module.id)) {
            return []
          }

          const modules = parent.module.imports
            .map((x): ModuleGraphNode<ModuleListItem, ModuleImport> | undefined => {
              const module = modulesMap.value.get(x.module_id)
              if (!module)
                return undefined
              if (seen.has(module))
                return undefined

              // Check if the module is a child of the current parent
              if (childToParentMap.has(module.id) && childToParentMap.get(module.id) !== parent.module.id)
                return undefined

              seen.add(module)

              if (isFirstCalculateGraph.value) {
                childToParentMap.set(module.id, parent.module.id)
              }

              return {
                module,
                import: x,
                expanded: !collapsedNodes.has(module.id),
                hasChildren: false,
              }
            })
            .filter(x => x !== undefined)

          return modules
        },
      )

      if (isFirstCalculateGraph.value) {
        isFirstCalculateGraph.value = false
      }

      // Calculate the layout
      const layout = tree<ModuleGraphNode<ModuleListItem, ModuleImport>>()
        .nodeSize([unref(spacing.height), unref(spacing.width) + unref(spacing.gap)])
      layout(root)

      const _nodes = root.descendants()

      for (const node of _nodes) {
        // Rotate the graph from top-down to left-right
        [node.x, node.y] = [node.y! - unref(spacing.width), node.x!]

        if (node.data.module.imports) {
          node.data.hasChildren = node.data.module.imports
            ?.filter(subNode => childToParentMap.get(subNode.module_id) === node.data.module.id)
            .length > 0
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
        .map((x): ModuleGraphLink<ModuleListItem, ModuleImport> => {
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
    :session="session"
    :modules="modules"
  >
    <template #default="{ node, nodesRefMap }">
      <DisplayModuleId
        :id="node.data.module.id"
        :ref="(el: any) => nodesRefMap.set(node.data.module.id, el?.$el)"
        :link="true"
        :session="session"
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
