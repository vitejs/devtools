<script lang="ts" setup>
import type { ChunkImport, Chunk as ChunkInfo } from '@rolldown/debug'
import type { SessionContext } from '../../../shared/types/data'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  chunkImport: ChunkImport
  session: SessionContext
  importer: ChunkInfo
}>()

const route = useRoute()

const rpc = useRpc()
const { state: chunk } = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-chunk-info']?.({
      session: props.session.id,
      id: props.chunkImport.chunk_id,
    })
  },
  null,
)
</script>

<template>
  <!-- <VisualLoading /> -->
  <NuxtLink v-if="chunk" flex="~ items-center" :to="{ path: route.path, query: { chunk: chunk.chunk_id } }">
    <!-- Icon, Name, Reason -->
    <div flex="~ gap-2 items-center" :title="`Chunk #${chunk.chunk_id}`">
      <div v-if="chunkImport.kind === 'import-statement'" i-ph-file-duotone />
      <div v-if="chunkImport.kind === 'dynamic-import'" i-ph-lightning-duotone />
      <div>{{ chunk.name || '[unnamed]' }}</div>
      <DisplayBadge :text="chunk.reason" />

      <!-- Import Kind -->
      <DisplayBadge v-if="chunkImport.kind === 'import-statement'" text="statement" :color="210" />
      <DisplayBadge v-if="chunkImport.kind === 'dynamic-import'" text="dynamic" :color="30" />
    </div>

    <div flex-auto />

    <div text-sm flex="~ items-center gap-2">
      <span op50 font-mono>#{{ chunk.chunk_id }}</span>
      <div flex="~ gap-1 items-center">
        <div i-ph-file-arrow-up-duotone />
        {{ chunk.imports.length }}
      </div>
      <div flex="~ gap-1 items-center">
        <div i-ph-package-duotone />
        {{ chunk.modules.length }}
      </div>
    </div>
  </NuxtLink>
</template>

<style>

</style>
