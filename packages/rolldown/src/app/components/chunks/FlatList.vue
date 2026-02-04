<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types'
import DataVirtualList from '@vitejs/devtools-ui/components/DataVirtualList.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'

withDefaults(defineProps<{
  chunks: Array<RolldownChunkInfo & { id: string }>
  session: SessionContext
  link?: boolean
  basic?: boolean
}>(), {
  link: true,
  basic: false,
})

const emit = defineEmits<{
  (e: 'select', chunk: RolldownChunkInfo & { id: string }): void
}>()
</script>

<template>
  <DataVirtualList
    :items="chunks"
    key-prop="chunk_id"
  >
    <template #default="{ item }">
      <div flex pb2 @click="emit('select', item)">
        <ChunksBaseInfo :chunk="item" :basic="basic" :link="link" w-full font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active" flex="~ gap-4 items-center">
          <template #left-after>
            <DisplayBadge v-if="item.is_initial" text="initial" />
          </template>
        </ChunksBaseInfo>
      </div>
    </template>
  </DataVirtualList>
</template>
