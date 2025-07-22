<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute, useRouter } from '#app/composables/router'
import { clearUndefined, toArray } from '@antfu/utils'
import { computedWithControl, debouncedWatch } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'
import { DefaultPluginType, getPluginTypeFromName, PluginTypeRules } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
}>()

const route = useRoute()
const router = useRouter()

const searchValue = ref<{ search: string, selected: string[] | null }>({
  search: (route.query.search || '') as string,
  selected: (route.query.plugin_types ? toArray(route.query.plugin_types) : null) as string[] | null,
})

const searchFilterTypes = computed(() => {
  return [
    ...PluginTypeRules.filter((rule) => {
      return props.session?.meta?.plugins?.some(item => rule.match.test(item.name))
    }),
    DefaultPluginType,
  ]
})

const filtered = computed(() => {
  let plugins = props.session?.meta?.plugins

  if (searchValue.value.selected) {
    plugins = plugins.filter((plugin) => {
      const type = getPluginTypeFromName(plugin.name)
      return searchValue.value.selected!.includes(type.name)
    })
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
  if (!searchValue.value.search) {
    return filtered.value
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

debouncedWatch(
  searchValue.value,
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
      <DataSearchPanel v-model="searchValue" :rules="searchFilterTypes" />
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
