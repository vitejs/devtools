<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
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
const moduleViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-duotone',
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

const filtered = computed(() => {
  let modules = parsedPaths.value
  if (filters.file_types) {
    modules = modules.filter(mod => filters.file_types!.includes(mod.type.name))
  }
  if (filters.node_modules) {
    modules = modules.filter(mod => mod.path.moduleName && filters.node_modules!.includes(mod.path.moduleName))
  }
  return modules.map(mod => ({ ...mod.mod, path: mod.path.path }))
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
    ignoreLocation: true,
    threshold: 0.4,
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

function toggleDisplay(type: ClientSettings['flowModuleGraphView']) {
  if (route.query.module) {
    router.replace({ query: { ...route.query, module: undefined } })
  }
  settings.value.flowModuleGraphView = type
}
</script>

<template>
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
          v-for="viewType of moduleViewTypes"
          :key="viewType.value"
          btn-action
          :class="settings.flowModuleGraphView === viewType.value ? 'bg-active' : 'grayscale op50'"
          @click="toggleDisplay(viewType.value)"
        >
          <div :class="viewType.icon" />
          {{ viewType.label }}
        </button>
      </div>
      <!-- TODO: should we add filters for node_modules? -->
      <!-- {{ allNodeModules }} -->
    </div>
    <template v-if="settings.flowModuleGraphView === 'list'">
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
    <template v-else-if="settings.flowModuleGraphView === 'graph'">
      <ModulesGraph
        :session="session"
        :modules="searched"
      />
    </template>
    <template v-else>
      <ModulesFolder
        :session="session"
        :modules="searched"
      />
    </template>
  </div>
</template>
