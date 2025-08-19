<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { ClientSettings } from '~/state/settings'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { settings } from '~/state/settings'

const props = defineProps<{
  session: SessionContext
}>()

const chunkViewTypes = [
  {
    label: 'List',
    value: 'list',
    icon: 'i-carbon-list',
  },
  {
    label: 'Graph',
    value: 'graph',
    icon: 'i-ph-graph-duotone',
  },
] as const

const rpc = useRpc()
const { state: chunks, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-chunks-graph']?.({
      session: props.session.id,
    })
  },
  null,
)

function toggleDisplay(type: ClientSettings['chunkViewType']) {
  settings.value.chunkViewType = type
}
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <div flex="~ gap-2 items-center" p2 border="~ base rounded-xl" bg-glass>
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
    </div>
    <template v-if="settings.chunkViewType === 'list'">
      <div class="px5 pt24" flex="~ col gap-4">
        <template v-for="chunk of chunks" :key="chunk.id">
          <DataChunkDetails
            border="~ base rounded-lg"
            p3
            :chunk="chunk"
            :session="session"
          />
        </template>
      </div>
    </template>
    <template v-else-if="settings.chunkViewType === 'graph'">
      <ChunksGraph
        :session="session"
        :chunks="chunks ?? []"
      />
    </template>
  </div>
</template>
