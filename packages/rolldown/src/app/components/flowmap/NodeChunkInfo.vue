<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'

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
    class="pl6"
  >
    <template #inner>
      <button
        class="px3 py1 hover:bg-active flex flex-inline gap-2 items-center"
        @click="emit('select', item)"
      >
        <slot name="button">
          <div class="flex flex-col gap-1 items-start p1">
            <div class="flex gap-2 items-center">
              <DisplayBadge :text="item.name || '<unnamed chunk>'" />
              <div class="flex-auto" />
              <div :title="`Chunk ID: ${item.chunk_id}`" class="op50 font-mono text-sm">
                #{{ item.chunk_id }}
              </div>
            </div>
            <div class="text-sm">
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
