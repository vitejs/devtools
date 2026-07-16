<script setup lang="ts">
import type { DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { ViteModuleListItem } from '~/types/modules'
import type { VitePluginItem } from '~/types/plugins'
import DataSearchPanel from '@vitejs/devtools-ui/components/Data/DataSearchPanel.vue'
import PluginsFlatList from '@vitejs/devtools-ui/components/Plugins/PluginsFlatList.vue'
import { computedWithControl, onKeyDown, useDebounceFn, watchDebounced } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'
import { useRpc } from '#imports'
import { onInspectModuleUpdated } from '~/composables/rpc'
import { DefaultPluginType, getPluginTypeFromName, PluginTypeRules } from '~/utils/icon'

type InspectMetadata = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-metadata']>>
type InspectModule = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-modules-list']>>[number]
type InspectQuery = Parameters<DevToolsRpcServerFunctions['vite:inspect:get-modules-list']>[0]

interface SerializedPlugin {
  name?: unknown
  enforce?: unknown
}

const rpc = useRpc()
const route = useRoute()
const router = useRouter()

const metadata = shallowRef<InspectMetadata | null>(null)
const modules = shallowRef<ViteModuleListItem[]>([])
const loading = ref(true)
const error = ref<Error | null>(null)

const selectedPluginQuery = computed(() => typeof route.query.plugin === 'string' ? route.query.plugin : undefined)

const searchValue = ref<{ search: string, selected: string[] | null }>({
  search: (route.query.search || '') as string,
  selected: (route.query.plugin_types ? toArray(route.query.plugin_types) : null) as string[] | null,
})

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

const plugins = computed<VitePluginItem[]>(() => {
  return currentInstance.value?.plugins.map((plugin, index) => normalizePlugin(plugin, index)) ?? []
})

const searchFilterTypes = computed(() => {
  return [
    ...PluginTypeRules.filter((rule) => {
      return plugins.value.some(item => rule.match.test(item.name))
    }),
    DefaultPluginType,
  ]
})

const filtered = computed(() => {
  let result = plugins.value

  if (searchValue.value.selected) {
    result = result.filter((plugin) => {
      const type = getPluginTypeFromName(plugin.name)
      return searchValue.value.selected!.includes(type.name)
    })
  }
  return result
})

const fuse = computedWithControl(
  () => filtered.value,
  () => new Fuse(filtered.value, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search)
    return filtered.value
  return fuse.value
    .search(searchValue.value.search)
    .map(result => result.item)
})

watchDebounced(
  searchValue.value,
  (value) => {
    router.replace({
      query: clearUndefined({
        ...route.query,
        search: value.search || undefined,
        plugin_types: value.selected || undefined,
      }),
    })
  },
  { debounce: 500 },
)

function normalizePlugin(plugin: unknown, index: number): VitePluginItem {
  const value = plugin && typeof plugin === 'object' ? plugin as SerializedPlugin : {}
  return {
    plugin_id: index,
    name: typeof value.name === 'string' ? value.name : `plugin-${index}`,
    enforce: value.enforce === 'pre' || value.enforce === 'post' ? value.enforce : undefined,
  }
}

function closeCurrentPanel() {
  if (selectedPluginQuery.value)
    router.replace({ query: { ...route.query, plugin: undefined } })
}

async function load(options: { silent?: boolean } = {}) {
  if (!options.silent)
    loading.value = true
  error.value = null
  try {
    metadata.value = await rpc.value.call('vite:inspect:get-metadata')
    if (query.value) {
      modules.value = (await rpc.value.call('vite:inspect:get-modules-list', query.value))
        .map(normalizeModule)
    }
    else {
      modules.value = []
    }
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

function normalizeModule(module: InspectModule): ViteModuleListItem {
  return {
    ...module,
    imports: module.deps.map(id => ({ module_id: id })),
  }
}

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

onKeyDown('Escape', (event) => {
  event.preventDefault()

  if (!event.isTrusted || event.repeat)
    return

  closeCurrentPanel()
})
</script>

<template>
  <VisualLoading
    v-if="loading"
    text="Loading plugins..."
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
  <div v-else relative min-h-screen>
    <div sticky left-4 right-4 top-4 z-panel-nav p-4>
      <DataSearchPanel v-model="searchValue" :rules="searchFilterTypes" />
    </div>
    <PluginsFlatList :plugins="searched ?? []" scroller="window" />
    <div
      fixed bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
    >
      <span op50>{{ searched.length }} of {{ plugins.length || 0 }}</span>
    </div>

    <div
      v-if="selectedPluginQuery && query" fixed inset-0
      backdrop-blur-8 backdrop-brightness-95 z-panel-content
      @click.self="closeCurrentPanel"
    >
      <div
        :key="selectedPluginQuery"
        fixed right-0 bottom-0 top-20 left-20 z-panel-content
        bg-glass border="l t base rounded-tl-xl"
      >
        <DataPluginDetailsLoader
          :plugin="selectedPluginQuery"
          :query="query"
          :modules="modules"
          :root="root"
          @close="closeCurrentPanel"
        />
      </div>
    </div>
  </div>
</template>
