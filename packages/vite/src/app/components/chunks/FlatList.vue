<script setup lang="ts">
import type { Chunk as ChunkInfo } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types'

defineProps<{
  chunks: ChunkInfo[]
  session: SessionContext
}>()
</script>

<template>
  <DataVirtualList
    :items="chunks"
    key-prop="chunk_id"
  >
    <template #default="{ item }">
      <div flex pb2>
        <ChunksBaseInfo :chunk="item" link w-full font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active" flex="~ gap-4 items-center" />
      </div>
    </template>
  </DataVirtualList>
</template>
