<script setup lang="ts">
import type { SessionContext } from '~~/shared/types/data'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  chunk: number
  session: SessionContext
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    return await rpc.value.$call(
      'vite:rolldown:get-chunk-info',
      {
        session: props.session.id,
        id: props.chunk,
      },
    )
  },
  null,
)
</script>

<template>
  <VisualLoading v-if="isLoading" />

  <div v-if="state" p4 relative h-full w-full of-auto z-panel-content>
    <DataChunkDetails :session="session" :chunk="state">
      <DisplayCloseButton
        @click="emit('close')"
      />
    </DataChunkDetails>
  </div>
</template>
