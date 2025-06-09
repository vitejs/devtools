<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, reactive, ref } from 'vue'
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
  file_types: (route.query.file_types || null) as string[] | null,
  node_modules: (route.query.node_modules || null) as string[] | null,
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
  const path = parseReadablePath(mod.id, props.session.rootDir)
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

const display = ref<'list' | 'graph'>('list')

function toggleDisplay() {
  if (route.query.module) {
    router.replace({ query: { ...route.query, module: undefined } })
  }
  display.value = display.value === 'list' ? 'graph' : 'list'
}
</script>

<template>
  <div flex="~ col gap-2" p4>
    <div h-20 />
    <div flex="col gap-2" right-4 top-4 border="~ base rounded-xl" p2 bg-glass fixed z-panel-nav>
      <button
        btn-action
        @click="toggleDisplay"
      >
        <div v-if="display === 'graph'" i-ph-graph-duotone />
        <div v-else i-ph-list-duotone />
        {{ display === 'list' ? 'List' : 'Graph' }}
      </button>
    </div>
    <div flex="col gap-2" left-4 top-4 border="~ base rounded-xl" bg-glass fixed z-panel-nav>
      <div border="b base">
        <input
          v-model="filters.search"
          p2 px4 w-full
          style="outline: none"
          placeholder="Search"
        >
      </div>
      <div flex="~ gap-2" p2>
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
      <!-- TODO: should we add filters for node_modules? -->
      <!-- {{ allNodeModules }} -->
    </div>
    <template v-if="display === 'list'">
      <ModulesFlatList
        v-if="display === 'list'"
        :session="session"
        :modules="searched"
      />
      <div text-center text-xs op50 m4>
        {{ filtered.length }} of {{ session.modulesList.length }}
      </div>
    </template>
    <template v-else>
      <ModulesGraph
        :session="session"
        :modules="searched"
      />
    </template>
  </div>

  <div
    v-if="route.query.module"
    :key="(route.query.module as string)"
    fixed right-0 bottom-0 top-20 z-panel-content min-w-200 of-auto bg-glass border="l t base rounded-tl-xl"
  >
    <FlowmapModuleFlowLoader
      :module="(route.query.module as string)"
      :session="session"
    />
    <DisplayCloseButton
      absolute right-2 top-2
      @click="router.replace({ query: { ...route.query, module: undefined } })"
    />
  </div>
</template>
