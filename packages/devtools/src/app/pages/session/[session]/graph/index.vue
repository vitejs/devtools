<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined, toArray } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'
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
    <template v-else-if="settings.moduleGraphViewType === 'graph'">
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
