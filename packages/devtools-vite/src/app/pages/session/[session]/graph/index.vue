<script setup lang="ts">
import type { ModuleImport, ModuleListItem, SessionContext } from '~~/shared/types'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import type { ClientSettings } from '~/state/settings'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined, toArray } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, nextTick, ref, unref } from 'vue'
import { createModuleGraph } from '~/composables/moduleGraph'

import { settings } from '~/state/settings'
import { parseReadablePath } from '~/utils/filepath'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
}>()

const route = useRoute()
const router = useRouter()

const searchValue = ref<{
  search: string
  selected: string[] | null
  [key: string]: any
}>({
  search: (route.query.search || '') as string,
  selected: (route.query.file_types ? toArray(route.query.file_types) : null) as string[] | null,
  node_modules: (route.query.node_modules ? toArray(route.query.node_modules) : null) as string[] | null,
})

const moduleViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-carbon-list',
  },
  {
    label: 'Detailed List',
    value: 'detailed-list',
    icon: 'i-carbon-list-boxes',
  },
  {
    label: 'Graph',
    value: 'graph',
    icon: 'i-ph-graph-duotone',
  },
  {
    label: 'Folder',
    value: 'folder',
    icon: 'i-ph-folder-duotone',
  },
] as const

debouncedWatch(
  searchValue.value,
  (f) => {
    const query: any = {
      ...route.query,
      search: f.search || undefined,
      file_types: f.selected || undefined,
      node_modules: f.node_modules || undefined,
    }
    router.replace({
      query: clearUndefined(query),
    })
  },
  { debounce: 500 },
)

const parsedPaths = computed(() => props.session.modulesList.map((mod) => {
  const path = parseReadablePath(mod.id, props.session.meta.cwd)
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    path,
    type,
  }
}))

const searchFilterTypes = computed(() => {
  return ModuleTypeRules.filter((rule) => {
    return parsedPaths.value.some(mod => rule.match.test(mod.mod.id))
  })
})

// const allNodeModules = computed(() => {
//   const nodeModules = new Set<string>()
//   for (const mod of parsedPaths.value) {
//     if (mod.path.moduleName)
//       nodeModules.add(mod.path.moduleName)
//   }
//   return nodeModules
// })

const filtered = computed(() => {
  let modules = parsedPaths.value
  if (searchValue.value.selected) {
    modules = modules.filter((mod) => {
      const type = getFileTypeFromModuleId(mod.mod.id)
      return searchValue.value.selected!.includes(type.name)
    })
  }
  if (searchValue.value.node_modules) {
    modules = modules.filter(mod => mod.path.moduleName && searchValue.value.node_modules!.includes(mod.path.moduleName))
  }
  return modules.map(mod => ({ ...mod.mod, path: mod.path.path }))
})

const fuse = computedWithControl(
  () => filtered.value,
  () => new Fuse(filtered.value, {
    includeScore: true,
    keys: ['id'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search) {
    return filtered.value
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

function toggleDisplay(type: ClientSettings['moduleGraphViewType']) {
  if (route.query.module) {
    router.replace({ query: { ...route.query, module: undefined } })
  }
  settings.value.moduleGraphViewType = type
}

createModuleGraph<ModuleListItem, ModuleImport>({
  modules: searched,
  spacing: {
    width: 400,
    height: 55,
    linkOffset: 20,
    margin: 800,
    gap: 150,
  },
  buildGraphFn: (options) => {
    const { isFirstCalculateGraph, scale, spacing, tree, hierarchy, collapsedNodes, container, modulesMap, nodes, links, nodesMap, linksMap, width, height, childToParentMap, focusOn } = options
    const rootModules = computed(() => {
      return searched.value.filter(x => x.importers.length === 0)
    })

    return function (focusOnFirstRootNode = true) {
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
  <div relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="searchFilterTypes">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of moduleViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.moduleGraphViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <!-- TODO: should we add filters for node_modules? -->
    <!-- {{ allNodeModules }} -->
    <template v-if="settings.moduleGraphViewType === 'list'">
      <div of-auto h-screen pt-45>
        <ModulesFlatList
          :session="session"
          :modules="searched"
        />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ session.modulesList.length }}</span>
        </div>
      </div>
    </template>
    <template v-else-if="settings.moduleGraphViewType === 'detailed-list'">
      <div of-auto h-screen pt-45>
        <ModulesDetailedList
          :session="session"
          :modules="searched"
        />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ session.modulesList.length }}</span>
        </div>
      </div>
    </template>
    <template v-else-if="settings.moduleGraphViewType === 'graph'">
      <DisplayModuleGraph
        :session="session"
        :modules="searched"
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
    <template v-else>
      <ModulesFolder
        :session="session"
        :modules="searched"
      />
    </template>
  </div>
</template>
