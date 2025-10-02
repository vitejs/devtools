<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types'

defineProps<{
  item: RolldownChunkInfo
  session: SessionContext
  active?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: RolldownChunkInfo): void
}>()
</script>

<template>
  <FlowmapNode
    :lines="{ top: true }"
    :active="active"
    class-node-inline="gap-2 items-center"
    pl6
  >
    <template #inner>
      <button
        px3 py1 hover="bg-active" flex="~ inline gap-2 items-center"
        @click="emit('select', item)"
      >
        <slot name="button">
          <div flex="~ col gap-1 items-start" p1>
            <div flex="~ gap-2 items-center">
              <DisplayBadge :text="item.name || '<unnamed chunk>'" />
              <div flex-auto />
              <div :title="`Chunk ID: ${item.chunk_id}`" op50 font-mono text-sm>
                #{{ item.chunk_id }}
              </div>
            </div>
            <div text-sm>
              {{ item.modules.length }} modules
            </div>
          </div>
        </slot>
      </button>
    </template>
    <template #inline-after>
      <DisplayBadge :text="item.reason" />
    </template>
  </FlowmapNode>
</template>
