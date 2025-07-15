<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  session: SessionContext
}>()

const rpc = useRpc()
const { state: chunks, isLoading } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-chunks-graph']?.({
      session: props.session.id,
    })
  },
  null,
)
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else p5 flex="~ col gap-4">
    Chunks
    <!-- TODO: graph view -->
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
