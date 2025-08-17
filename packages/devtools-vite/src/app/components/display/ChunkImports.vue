<script lang="ts" setup>
import type { ChunkImport } from '@rolldown/debug'
import type { SessionContext } from '../../../shared/types/data'
import { useAsyncState } from '@vueuse/core'
import { useRpc } from '../../../modules/rpc/runtime/composables/rpc'

const props = defineProps<{
  chunkImport: ChunkImport
  session: SessionContext
}>()

const rpc = useRpc()
const { state: chunk } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-chunk-by-id']?.({
      session: props.session.id,
      id: props.chunkImport.chunk_id,
    })
  },
  null,
)
</script>

<template>
  <!-- <VisualLoading /> -->
  <template v-if="chunk">
    <div flex="~ gap-4 items-center">
      <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
        <div />
        <div>{{ chunk.name || '[unnamed]' }}</div>
        <DisplayBadge :text="chunk.reason" />
      </div>
      <div flex-auto />
      <span op50 font-mono>#{{ chunk.chunk_id }}</span>
      <div flex="~ gap-1 items-center">
        <div i-ph-package-duotone />
        {{ chunk.modules.length }}
      </div>
    </div>
  </template>
  <div v-else>
    {{ chunk }}
  </div>
</template>

<style>

</style>
