<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
import { useRpc } from '#imports'
import { computedWithControl, useAsyncState } from '@vueuse/core'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

const searchValue = ref<{ search: string }>({
  search: '',
})

const assetViewTpyes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-ph-list-duotone',
  },
  {
    label: 'Folder',
    value: 'folder',
    icon: 'i-ph-folder-duotone',
  },
  {
    label: 'Treemap',
    value: 'treemap',
    icon: 'i-ph-checkerboard-duotone',
  },
] as const
const rpc = useRpc()
const { state: assets, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-assets-list']?.({
      session: props.session.id,
    })
  },
  null,
)

const fuse = computedWithControl(
  () => assets.value,
  () => new Fuse(assets.value!, {
    includeScore: true,
    keys: ['filename'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search) {
    return assets.value!
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

function toggleDisplay(type: ClientSettings['assetViewType']) {
  settings.value.assetViewType = type
}
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="[]">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of assetViewTpyes"
            :key="viewType.value"
            btn-action
            :class="settings.assetViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt32>
      <template v-if="settings.assetViewType === 'list'">
        <AssetsList v-if="searched?.length" :assets="searched" :session="session" />
      </template>
      <template v-else-if="settings.assetViewType === 'folder'">
        <AssetsFolder v-if="searched?.length" :assets="searched" :session="session" />
      </template>
      <template v-else-if="settings.assetViewType === 'treemap'">
        <AssetsTreemap v-if="searched?.length" :assets="searched" :session="session" />
      </template>
    </div>
    <div
      absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
    >
      <span op50>{{ searched.length }} of {{ assets?.length || 0 }}</span>
    </div>
  </div>
</template>
