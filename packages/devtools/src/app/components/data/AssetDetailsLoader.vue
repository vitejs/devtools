<script setup lang="ts">
import type { RolldownAssetInfo, RolldownChunkInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  asset: string
  session: SessionContext
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const { state } = useAsyncState(
  async () => {
    const res = await rpc.value!['vite:rolldown:get-asset-details']?.({
      session: props.session.id,
      id: props.asset,
    })
    return {
      asset: { ...res?.asset, type: 'asset' },
      chunks: [{ ...res?.chunk, type: 'chunk' }],
    } satisfies {
      asset: RolldownAssetInfo
      chunks: RolldownChunkInfo[]
    }
  },
  null,
)
</script>

<template>
  <div v-if="state?.asset" p4 relative h-full w-full of-auto pt12>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <DataAssetDetails :asset="state.asset" :session="session" :chunks="state?.chunks" />
  </div>
</template>
