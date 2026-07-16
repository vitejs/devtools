<script setup lang="ts">
import type { DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { ClientSettings } from '~/state/settings'
import type { ViteModuleListItem } from '~/types/modules'
import DataPathSelector from '@vitejs/devtools-ui/components/Data/DataPathSelector.vue'
import DataSearchPanel from '@vitejs/devtools-ui/components/Data/DataSearchPanel.vue'
import { useGraphPathManager } from '@vitejs/devtools-ui/composables/graph-path-selector'
import { computedWithControl, onKeyDown, useDebounceFn, watchDebounced } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'
import { useRpc } from '#imports'
import { onInspectModuleUpdated } from '~/composables/rpc'
import { settings } from '~/state/settings'
import { parseReadablePath } from '~/utils/filepath'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

type InspectMetadata = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-metadata']>>
type InspectModule = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-modules-list']>>[number]
type InspectQuery = Parameters<DevToolsRpcServerFunctions['vite:inspect:get-modules-list']>[0]

const rpc = useRpc()
const route = useRoute()
const router = useRouter()

const metadata = shallowRef<InspectMetadata | null>(null)
const rawModules = shallowRef<InspectModule[]>([])
const loading = ref(true)
const error = ref<Error | null>(null)

const selectedModuleQuery = computed(() => typeof route.query.module === 'string' ? route.query.module : undefined)

const searchValue = ref<{
  search: string | false
  selected: string[] | null
  [key: string]: any
}>({
  search: (route.query.search || '') as string,
  selected: route.query.file_types ? toArray(route.query.file_types) : null,
  node_modules: route.query.node_modules ? toArray(route.query.node_modules) : null,
})

const moduleViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-bullets-duotone',
  },
  {
    label: 'Detailed List',
    value: 'detailed-list',
    icon: 'i-ph-list-magnifying-glass-duotone',
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

const currentInstance = computed(() => metadata.value?.instances[0])
const currentEnv = computed(() => currentInstance.value?.environments[0] || '')
const root = computed(() => currentInstance.value?.root || '')

const query = computed<InspectQuery | null>(() => {
  if (!currentInstance.value?.vite || !currentEnv.value)
    return null
  return {
    vite: currentInstance.value.vite,
    env: currentEnv.value,
  }
})

const modules = computed<ViteModuleListItem[]>(() => {
  return rawModules.value.map((module) => {
    const transforms = module.plugins
      .filter(plugin => plugin.transform != null)
      .map(plugin => ({
        plugin_name: plugin.name,
        source_code_size: module.sourceSize,
        transformed_code_size: module.distSize,
        duration: plugin.transform ?? 0,
      }))

    return {
      ...module,
      imports: module.deps.map(id => ({ module_id: id })),
      buildMetrics: {
        resolve_ids: module.plugins
          .filter(plugin => plugin.resolveId != null)
          .map(plugin => ({ duration: plugin.resolveId ?? 0 })),
        loads: [],
        transforms,
      },
    }
  })
})

watchDebounced(
  searchValue.value,
  (f) => {
    router.replace({
      query: clearUndefined({
        ...route.query,
        search: f.search || undefined,
        file_types: f.selected || undefined,
        node_modules: f.node_modules || undefined,
      }),
    })
  },
  { debounce: 500 },
)

const parsedPaths = computed(() => modules.value.map((mod) => {
  const path = parseReadablePath(mod.id, root.value)
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

const { pathSelectorVisible, selectPathNodes, togglePathSelector, normalizedGraph } = useGraphPathManager<ViteModuleListItem>({
  onToggle: (visible) => {
    searchValue.value.search = visible ? false : ''
  },
  dataMap: computed(() => new Map(modules.value.map(m => [m.id, m]))),
  list: filtered,
  importIdKey: 'module_id',
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

const searched = computed<ViteModuleListItem[]>(() => {
  if (!searchValue.value.search)
    return filtered.value
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

function closeCurrentPanel() {
  if (selectedModuleQuery.value)
    router.replace({ query: { ...route.query, module: undefined } })
}

async function load(options: { silent?: boolean } = {}) {
  if (!options.silent)
    loading.value = true
  error.value = null
  try {
    metadata.value = await rpc.value.call('vite:inspect:get-metadata')
    if (query.value)
      rawModules.value = await rpc.value.call('vite:inspect:get-modules-list', query.value)
    else
      rawModules.value = []
  }
  catch (err) {
    error.value = err as Error
  }
  finally {
    if (!options.silent)
      loading.value = false
  }
}

const reloadOnModuleUpdated = useDebounceFn(() => {
  load({ silent: true })
}, 100)

function toArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [String(value)]
}

function clearUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

onMounted(() => {
  load()
})

onInspectModuleUpdated(() => {
  reloadOnModuleUpdated()
})

onKeyDown('Escape', (e) => {
  e.preventDefault()

  if (!e.isTrusted || e.repeat)
    return

  closeCurrentPanel()
})
</script>

<template>
  <VisualLoading
    v-if="loading"
    text="Loading modules..."
  />
  <div v-else-if="error" h-full flex="~ col gap-3 items-center justify-center" p8 text-center>
    <div i-ph-warning-duotone text-4xl text-amber />
    <div font-mono text-sm max-w-180 ws-pre-wrap>
      {{ error.message }}
    </div>
    <button btn-action @click="load()">
      <span i-ph-arrow-clockwise-duotone />
      Retry
    </button>
  </div>
  <div v-else relative :class="{ 'max-h-screen of-hidden': settings.moduleGraphViewType === 'graph' }">
    <div sticky left-4 right-4 top-4 z-panel-nav p-4>
      <DataSearchPanel v-model="searchValue" :rules="searchFilterTypes">
        <template v-if="pathSelectorVisible" #search>
          <DataPathSelector :data="searched" import-id-key="module_id" :search-keys="['id']" @select="selectPathNodes" @close="togglePathSelector(false)">
            <template #list="{ select, data }">
              <ModulesFlatList
                v-if="data?.length"
                :root="root"
                :modules="data"
                disable-tooltip
                :link="false"
                @select="select"
              />
            </template>
            <template #item="{ id }">
              <DisplayModuleId
                :id="id"
                :cwd="root"
                block text-nowrap
                :link="false"
                :disable-tooltip="true"
              />
            </template>
          </DataPathSelector>
        </template>
        <template #search-end>
          <div v-if="settings.moduleGraphViewType === 'graph'" h10 mr2 flex="~ items-center">
            <button
              w-8 h-8 rounded-full flex items-center justify-center
              hover="bg-active op100" op50 title="Graph Path Selector" @click="togglePathSelector(true)"
            >
              <i i-ri:route-line flex />
            </button>
          </div>
        </template>
        <div flex="~ wrap gap-2 items-center" p2 border="t base">
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
    <ModulesFlatList
      v-if="settings.moduleGraphViewType === 'list'"
      :root="root"
      :modules="searched"
      scroller="window"
    />
    <ModulesDetailedList
      v-else-if="settings.moduleGraphViewType === 'detailed-list'"
      :root="root"
      :modules="searched"
      scroller="window"
    />
    <ModulesGraph
      v-else-if="settings.moduleGraphViewType === 'graph'"
      :root="root"
      :modules="normalizedGraph"
    />
    <ModulesFolder
      v-else
      :root="root"
      :modules="searched"
    />
    <div
      v-if="settings.moduleGraphViewType === 'list' || settings.moduleGraphViewType === 'detailed-list'"
      fixed bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
    >
      <span op50>{{ searched.length }} of {{ modules.length }}</span>
    </div>

    <div
      v-if="selectedModuleQuery && query" fixed inset-0
      backdrop-blur-8 backdrop-brightness-95 z-panel-content
      @click.self="closeCurrentPanel"
    >
      <div
        :key="selectedModuleQuery"
        fixed right-0 bottom-0 top-20 left-20 z-panel-content
        bg-glass border="l t base rounded-tl-xl"
      >
        <DataModuleDetailsLoader
          :module="selectedModuleQuery"
          :query="query"
          :modules="modules"
          :root="root"
          @close="closeCurrentPanel"
        />
      </div>
    </div>
  </div>
</template>
