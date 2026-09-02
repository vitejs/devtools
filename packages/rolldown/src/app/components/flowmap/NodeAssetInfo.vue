<script setup lang="ts">
import type { RolldownAssetInfo, SessionContext } from '~~/shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'

defineProps<{
  item: RolldownAssetInfo
  session: SessionContext
  active?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: RolldownAssetInfo): void
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
              <DisplayModuleId :id="item.filename" :session />
            </div>
          </div>
        </slot>
      </button>
    </template>
    <template #inline-after>
      <DisplayFileSizeBadge :bytes="item.size" class="text-sm" />
      <DisplayBadge :text="item.type" />
    </template>
  </FlowmapNode>
</template>
