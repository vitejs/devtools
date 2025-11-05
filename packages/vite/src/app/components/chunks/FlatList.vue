<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types'

defineProps<{
  chunks: RolldownChunkInfo[]
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
        <ChunksBaseInfo :chunk="item" link w-full font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active" flex="~ gap-4 items-center">
          <template #left-after>
            <DisplayBadge v-if="item.is_initial" text="initial" />
          </template>
        </ChunksBaseInfo>
      </div>
    </template>
  </DataVirtualList>
</template>
