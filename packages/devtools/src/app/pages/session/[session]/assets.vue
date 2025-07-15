<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

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
    label: 'Flamechart',
    value: 'flamechart',
    icon: 'i-ph-chart-donut-duotone',
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

function toggleDisplay(type: ClientSettings['assetViewType']) {
  settings.value.assetViewType = type
}
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else p4 flex="~ col gap-4">
    <div flex="~ gap-2">
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
    <template v-if="settings.assetViewType === 'list'">
      <AssetsList v-if="assets?.length" :assets="assets" :session="session" />
    </template>
    <template v-else-if="settings.assetViewType === 'folder'">
      <AssetsFolder v-if="assets?.length" :assets="assets" :session="session" />
    </template>
    <template v-else>
      WIP: Flamechart view
    </template>
  </div>
</template>
