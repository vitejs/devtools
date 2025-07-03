<script setup lang="ts">
import type { ModuleDest, ModuleTreeNode, SessionContext } from '~~/shared/types'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined, toArray } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, reactive } from 'vue'
import { settings } from '~/state/settings'
import { parseReadablePath } from '~/utils/filepath'
import { getFileTypeFromModuleId, getFileTypeFromName } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
}>()

interface Filters {
  search: string
  file_types: string[] | null
  node_modules: string[] | null
}

const route = useRoute()
const router = useRouter()

const filters = reactive<Filters>({
  search: (route.query.search || '') as string,
  file_types: (route.query.file_types ? toArray(route.query.file_types) : null) as string[] | null,
  node_modules: (route.query.node_modules ? toArray(route.query.node_modules) : null) as string[] | null,
})

debouncedWatch(
  filters,
  (f) => {
    const query: any = {
      ...route.query,
      search: f.search || undefined,
      file_types: f.file_types || undefined,
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

// const allNodeModules = computed(() => {
//   const nodeModules = new Set<string>()
//   for (const mod of parsedPaths.value) {
//     if (mod.path.moduleName)
//       nodeModules.add(mod.path.moduleName)
//   }
//   return nodeModules
// })

const allFileTypes = computed(() => {
  const fileTypes = new Set<string>()
  for (const mod of parsedPaths.value) {
    fileTypes.add(mod.type.name)
  }
  return fileTypes
})

function toTree(modules: ModuleDest[], name: string) {
  const node: ModuleTreeNode = { name, children: {}, items: [] }

  function add(mod: ModuleDest, parts: string[], current = node) {
    if (!mod)
      return

    if (parts.length <= 1) {
      current.items.push(mod)
      return
    }

    const first = parts.shift()!
    if (!current.children[first])
      current.children[first] = { name: first, children: {}, items: [] }
    add(mod, parts, current.children[first])
  }

  modules.forEach((m) => {
    const parts = m.path.split(/\//g).filter(Boolean)
    add(m, parts)
  })

  function flat(node: ModuleTreeNode) {
    if (!node)
      return
    const children = Object.values(node.children)
    if (children.length === 1 && !node.items.length) {
      const child = children[0]
      node.name = node.name ? `${node.name}/${child.name}` : child.name
      node.items = child.items
      node.children = child.children
      flat(node)
    }
    else {
      children.forEach(flat)
    }
  }

  Object.values(node.children).forEach(flat)

  return node
}

const moduleTree = computed(() => {
  if (!props.session.modulesList.length) {
    return {
      workspace: {
        children: {},
        items: [],
      },
      nodeModules: {
        children: {},
        items: [],
      },
      virtual: {
        children: {},
        items: [],
      },
    }
  }
  const inWorkspace: ModuleDest[] = []
  const inNodeModules: ModuleDest[] = []
  const inVirtual: ModuleDest[] = []

  parsedPaths.value.map(i => ({ full: i.mod.id, path: i.mod.id, _p: i.path.path })).forEach((i) => {
    if (i.full.startsWith(props.session.meta.cwd) && !i._p.startsWith('../')) {
      inWorkspace.push(i)
    }
    else if (i.full.includes('node_modules')) {
      inNodeModules.push(i)
    }
    else if (i.full.startsWith('virtual:')) {
      inVirtual.push(i)
    }
  })

  inWorkspace.forEach(i => i.path = i.path.slice(props.session.meta.cwd.length + 1))

  return {
    workspace: toTree(inWorkspace, 'Project Root'),
    nodeModules: toTree(inNodeModules, 'Node Modules'),
    virtual: toTree(inVirtual, 'Virtual Modules'),
  }
})

const filtered = computed(() => {
  let modules = parsedPaths.value
  if (filters.file_types) {
    modules = modules.filter(mod => filters.file_types!.includes(mod.type.name))
  }
  if (filters.node_modules) {
    modules = modules.filter(mod => mod.path.moduleName && filters.node_modules!.includes(mod.path.moduleName))
  }
  return modules.map(mod => mod.mod)
})

function isFileTypeSelected(type: string) {
  return filters.file_types == null || filters.file_types.includes(type)
}

function toggleFileType(type: string) {
  if (filters.file_types == null) {
    filters.file_types = Array.from(allFileTypes.value)
  }

  if (filters.file_types.includes(type)) {
    filters.file_types = filters.file_types.filter(t => t !== type)
  }
  else {
    filters.file_types.push(type)
  }
  if (filters.file_types.length === allFileTypes.value.size) {
    filters.file_types = null
  }
}

const fuse = computedWithControl(
  () => filtered.value,
  () => new Fuse(filtered.value, {
    includeScore: true,
    keys: ['id'],
  }),
)

const searched = computed(() => {
  if (filters.search === '') {
    return filtered.value
  }
  return fuse.value
    .search(filters.search)
    .map(r => r.item)
})

function toggleDisplay() {
  if (route.query.module) {
    router.replace({ query: { ...route.query, module: undefined } })
  }
  settings.value.flowModuleGraphView = settings.value.flowModuleGraphView === 'list' ? 'graph' : 'list'
}
</script>

<template>
  <ModulesTreeNode
    v-if="Object.keys(moduleTree.workspace.children).length"
    :node="moduleTree.workspace"
    p="l3 t4"
    icon="i-carbon-portfolio"
  />
  <div relative max-h-screen of-hidden>
    <div flex="col gap-2" absolute left-4 top-4 max-w-90vw border="~ base rounded-xl" bg-glass z-panel-nav>
      <div border="b base">
        <input
          v-model="filters.search"
          p2 px4 w-full
          style="outline: none"
          placeholder="Search"
        >
      </div>
      <div flex="~ gap-2 wrap" p2>
        <label
          v-for="type of allFileTypes"
          :key="type"
          border="~ base rounded-md" px2 py1
          flex="~ items-center gap-1"
          select-none
          :title="type"
          :class="isFileTypeSelected(type) ? 'bg-active' : 'grayscale op50'"
        >
          <input
            type="checkbox"
            :checked="isFileTypeSelected(type)"
            mr1
            @change="toggleFileType(type)"
          >
          <div :class="getFileTypeFromName(type).icon" icon-catppuccin />
          <div text-sm>{{ getFileTypeFromName(type).description }}</div>
        </label>
      </div>
      <div flex="~ gap-2 items-center" p2 border="t base">
        <span op50 pl2 text-sm>View as</span>
        <button
          btn-action
          @click="toggleDisplay"
        >
          <div v-if="settings.flowModuleGraphView === 'graph'" i-ph-graph-duotone />
          <div v-else i-ph-list-duotone />
          {{ settings.flowModuleGraphView === 'list' ? 'List' : 'Graph' }}
        </button>
      </div>
      <!-- TODO: should we add filters for node_modules? -->
      <!-- {{ allNodeModules }} -->
    </div>
    <template v-if="settings.flowModuleGraphView === 'list'">
      <div of-scroll max-h-screen pt-45 relative>
        <ModulesFlatList
          v-if="settings.flowModuleGraphView === 'list'"
          :session="session"
          :modules="searched"
        />
        <div text-center text-xs op50 m4>
          {{ filtered.length }} of {{ session.modulesList.length }}
        </div>
      </div>
    </template>
    <template v-else>
      <ModulesGraph
        :session="session"
        :modules="searched"
      />
    </template>
  </div>
</template>
