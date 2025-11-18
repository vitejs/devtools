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
    const res = await rpc.value.$call(
      'vite:rolldown:get-asset-details',
      {
        session: props.session.id,
        id: props.asset,
      },
    )
    if ('chunk' in res) {
      return {
        asset: { ...res?.asset, type: 'asset' },
        chunks: [{ ...res?.chunk, type: 'chunk' }],
        importers: res?.importers,
        imports: res?.imports,
      } as {
        asset: RolldownAssetInfo
        chunks: RolldownChunkInfo[]
        importers: RolldownAssetInfo[]
        imports: RolldownAssetInfo[]
      }
    }
    else {
      return {
        asset: { ...res?.asset, type: 'asset' },
        chunks: [],
        importers: [],
        imports: [],
      } satisfies {
        asset: RolldownAssetInfo
        chunks: RolldownChunkInfo[]
        importers: RolldownAssetInfo[]
        imports: RolldownAssetInfo[]
      }
    }
  },
  null,
)
</script>

<template>
  <div v-if="state?.asset" p4 relative h-full w-full of-auto bg-glass z-panel-content>
    <DataAssetDetails :asset="state.asset" :session="session" :chunks="state?.chunks" :importers="state?.importers" :imports="state?.imports">
      <DisplayCloseButton
        @click="emit('close')"
      />
    </DataAssetDetails>
  </div>
</template>
