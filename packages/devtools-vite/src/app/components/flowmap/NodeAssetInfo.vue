<script setup lang="ts">
import type { RolldownAssetInfo, SessionContext } from '~~/shared/types'

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
              <DisplayModuleId :id="item.filename" :session />
            </div>
          </div>
        </slot>
      </button>
    </template>
    <template #inline-after>
      <DisplayFileSizeBadge :bytes="item.size" text-sm />
      <DisplayBadge :text="item.type" />
    </template>
  </FlowmapNode>
</template>
