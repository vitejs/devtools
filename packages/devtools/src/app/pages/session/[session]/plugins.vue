<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined, toArray, uniqueBy } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, reactive } from 'vue'
import { getPluginTypeFromName } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
}>()

const route = useRoute()
const router = useRouter()

const parsedPlugins = computed(() => {
  const { plugins = [] } = props.session?.meta
  function getPluginType(input: string): string {
    const match = input.match(/^([^:]+):/)
    return match ? match[1] : 'plugin'
  }
  return plugins.map((item) => {
    const type = getPluginType(item.name)
    return {
      ...item,
      type,
    }
  })
})

const searchValue = reactive<{ search: string, selected: string[] | null }>({
  search: (route.query.search || '') as string,
  selected: (route.query.plugin_types ? toArray(route.query.plugin_types) : null) as string[] | null,
})

const searchFilterTypes = computed(() => {
  const pluginTypes = parsedPlugins.value.map((item) => {
    const { description: label, name: value, icon } = getPluginTypeFromName(item.type)
    return { label, value, icon }
  })
  return uniqueBy(pluginTypes, (a, b) => a.value === b.value)
})

const filtered = computed(() => {
  let plugins = parsedPlugins.value
  if (searchValue.selected) {
    plugins = plugins.filter(plugin => searchValue.selected?.includes(plugin.type))
  }
  return plugins
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
  if (!searchValue.search) {
    return filtered.value
  }
  return fuse.value
    .search(searchValue.search)
    .map(r => r.item)
})

debouncedWatch(
  searchValue,
  (f) => {
    const query: any = {
      ...route.query,
      search: f.search || undefined,
      plugin_types: f.selected || undefined,
    }
    router.replace({
      query: clearUndefined(query),
    })
  },
  { debounce: 500 },
)
</script>

<template>
  <div relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :filter-types="searchFilterTypes" />
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt32>
      <PluginsFlatList :plugins="searched ?? []" />
      <div
        absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
      >
        <span op50>{{ searched.length }} of {{ session?.meta?.plugins?.length || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<!--
      TODO: plugins framegraph
        Two different views direction:
          - plugins -> hooks -> modules
          - modules -> hooks -> plugins
-->
