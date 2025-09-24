<script setup lang="ts">
import type { SessionContext } from '~~/shared/types/data'
import type { ClientSettings } from '~/state/settings'
import { useRpc } from '#imports'
import { computedWithControl, useAsyncState } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()
const packageViewTpyes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-duotone',
  },
] as const

const packageTypeRules = [
  {
    match: /.*/,
    name: 'direct',
    description: 'Direct Packages',
    icon: 'i-octicon:package-dependencies-24 light:filter-invert-30!',
  },
  {
    match: /.*/,
    name: 'transitive',
    description: 'Transitive Packages',
    icon: 'i-octicon:package-24  light:filter-invert-30!',
  },
  {
    match: /.*/,
    name: 'duplicate',
    description: 'Duplicate Packages',
    icon: 'i-tabler:packages light:filter-invert-30!',
  },
]
const rpc = useRpc()
const searchValue = ref<{ search: string, selected: string[] }>({
  search: '',
  selected: ['direct', 'transitive'],
})
const { state: packages, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-packages']?.({
      session: props.session.id,
    })
  },
  null,
)

const fuse = computedWithControl(
  () => packages.value,
  () => new Fuse(packages.value!, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => (
  (searchValue.value.search
    ? fuse.value.search(searchValue.value.search).map(r => r.item)
    : [...(packages.value || [])]).filter(i => !!i.transformedCodeSize)),
)

const sortedSearched = computed(() => {
  const packagesSizeSortType = settings.value.packageSizeSortType
  const data = [...searched.value].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return packagesSizeSortType
    ? data.sort((a, b) => packagesSizeSortType === 'asc' ? a.transformedCodeSize - b.transformedCodeSize : b.transformedCodeSize - a.transformedCodeSize)
    : data
})

function toggleDisplay(type: ClientSettings['packageViewType']) {
  settings.value.packageViewType = type
}
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="packageTypeRules">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of packageViewTpyes"
            :key="viewType.value"
            btn-action
            :class="settings.packageViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt44 px4 pb4>
      <template v-if="settings.packageViewType === 'list'">
        <PackagesTable :packages="sortedSearched" />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ packages?.length || 0 }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
