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
const rpc = useRpc()
const searchValue = ref<{ search: string }>({
  search: '',
})
const { state: packages, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-packages']?.({
      session: props.session.id,
    })
  },
  null,
)

const normalizedPackages = computed(() => {
  // console.log('filtered', packages.value)
  return packages.value
})

const fuse = computedWithControl(
  () => packages.value,
  () => new Fuse(packages.value!, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search) {
    return packages.value!
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

function toggleDisplay(type: ClientSettings['packageViewType']) {
  settings.value.packageViewType = type
}
</script>

<template>
  {{ normalizedPackages }}
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="[]">
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
    <div of-auto h-screen flex="~ col gap-2" pt32>
      <template v-if="settings.packageViewType === 'list'">
        <PackagesList :packages="searched" />
        <div
          absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
        >
          <span op50>{{ searched.length }} of {{ packages?.length || 0 }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
