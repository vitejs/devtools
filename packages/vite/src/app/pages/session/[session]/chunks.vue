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

const chunkViewTypes = [
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
] as const

const searchValue = ref<{ search: string }>({
  search: '',
})

const rpc = useRpc()
const { state: chunks, isLoading } = useAsyncState(
  async () => {
    return await rpc.value.$call(
      'vite:rolldown:get-chunks-graph',
      { session: props.session.id },
    )
  },
  null,
)

const normalizedChunks = computed(() => chunks.value?.map(x => ({
  ...x,
  id: `${x.chunk_id}`,
})) ?? [])

const fuse = computedWithControl(
  () => normalizedChunks.value,
  () => new Fuse(normalizedChunks.value!, {
    includeScore: true,
    keys: ['name'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searched = computed(() => {
  if (!searchValue.value.search) {
    return normalizedChunks.value!
  }
  return fuse.value
    .search(searchValue.value.search)
    .map(r => r.item)
})

function toggleDisplay(type: ClientSettings['chunkViewType']) {
  settings.value.chunkViewType = type
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
            v-for="viewType of chunkViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.chunkViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
      </DataSearchPanel>
    </div>
    <template v-if="settings.chunkViewType === 'list'">
      <div class="px5 pt32 of-auto h-screen" flex="~ col gap-4">
        <ChunksFlatList
          :session="session"
          :chunks="searched"
        />
      </div>
    </template>
    <template v-if="settings.chunkViewType === 'detailed-list'">
      <div class="px5 pt32 of-auto h-screen" flex="~ col gap-4">
        <template v-for="chunk of searched" :key="chunk.id">
          <DataChunkDetails
            border="~ base rounded-lg"
            p3
            :chunk="chunk"
            :chunks="searched!"
            :session="session"
          />
        </template>
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'graph'">
      <ChunksGraph
        class="pt32"
        :session="session"
        :chunks="searched"
      />
    </template>
  </div>
</template>
