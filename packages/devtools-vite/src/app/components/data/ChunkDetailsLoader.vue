<script setup lang="ts">
import type { SessionContext } from '../../../shared/types/data'
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
    return await rpc.value!['vite:rolldown:get-chunk-by-id']?.({
      session: props.session.id,
      id: props.chunk,
    })
  },
  null,
)
</script>

<template>
  <VisualLoading v-if="isLoading" />

  <div v-if="state" p4 pt-0 relative h-full w-full of-auto z-panel-content>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <span op50 min-h-12 flex="~ items-center">
      Import by
      <NuxtLink font-mono :to="{ query: { chunk: 1 } }">
        #1
      </NuxtLink>
    </span>
    <DataChunkDetails :session="session" :chunk="state" />
  </div>
</template>
