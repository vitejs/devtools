<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  session: SessionContext
}>()

const rpc = useRpc()
const { state: assets } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-assets-list']?.({
      session: props.session.id,
    })
  },
  null,
)
</script>

<template>
  <div p5 flex="~ col gap-4">
    Assets
    <!--
      WIP:
      - Use tree view to show assets
      - Show asssets detail on the right panel
      - View of Flamechart with nanovis
    -->
    <template v-for="asset of assets" :key="asset.filename">
      <pre>{{
        {
          filename: asset.filename,
          size: asset.size,
          chunk: asset.chunk_id,
        }
      }}</pre>
    </template>
  </div>
</template>
