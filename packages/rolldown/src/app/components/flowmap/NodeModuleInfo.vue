<script setup lang="ts">
import type { RolldownModuleFlowNode, SessionContext } from '~~/shared/types'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import DisplayPluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'
import { computed } from 'vue'
import { isFlowmapSwapping } from '~/state/flowmap'

const props = defineProps<{
  item: RolldownModuleFlowNode
  session: SessionContext
  active?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: RolldownModuleFlowNode): void
  (e: 'toggleShowAll', item: RolldownModuleFlowNode): void
}>()

const isDashed = computed(() => {
  switch (props.item.type) {
    case 'transform':
      return props.item.content_from === props.item.content_to
    case 'load':
      return props.item.content == null
    default:
      return false
  }
})

function enter() {
  if (isFlowmapSwapping.value)
    emit('select', props.item)
}

function down() {
  emit('select', props.item)
  isFlowmapSwapping.value = true
}

const importerModule = computed(() => {
  if (props.item.type !== 'resolve')
    return undefined
  const id = props.item.importer
  return props.session.modulesList.find(m => m.id === id)
})
</script>

<template>
  <div v-if="item.type === 'no_changes_collapsed'" class="pl10">
    <div
      class="flex gap-2 items-center text-sm border-l py1"
      :class="active ? 'border-flow-line-active' : 'border-flow-line'"
    >
      <div
        class="w-2 h-2 border-4 rounded-full ml--1 translate-x--0.5px"
        :class="active ? 'border-flow-line-active' : 'border-flow-line'"
      />
      <span class="op50">{{ item.count }} plugins did not change the content but cost</span>
      <DisplayDuration :duration="item.duration" :color="true" :factor="5" class="text-xs" />
      <span class="op50 flex-shrink-0">in total</span>
      <button
        class="border border-base rounded-full px2 py-px op50 hover:op100"
        @click="emit('toggleShowAll', item)"
      >
        Expand
      </button>
    </div>
  </div>
  <div v-else-if="item.type === 'no_changes_hide'" class="pl10">
    <div
      class="flex gap-2 items-center text-sm border-l py1"
      :class="active ? 'border-flow-line-active' : 'border-flow-line'"
    >
      <div
        class="w-2 h-2 border-4 rounded-full ml--1 translate-x--0.5px"
        :class="active ? 'border-flow-line-active' : 'border-flow-line'"
      />
      <span class="op50">{{ item.count }} plugins did not change the content but cost</span>
      <DisplayDuration :duration="item.duration" :color="true" :factor="5" class="text-xs" />
      <span class="op50 flex-shrink-0">in total</span>
      <button
        class="border border-base rounded-full px2 py-px op50 hover:op100"
        @click="emit('toggleShowAll', item)"
      >
        Hide
      </button>
    </div>
  </div>
  <FlowmapNode
    v-else
    :lines="{ top: true }"
    :class-node-outer="isDashed ? 'border-dashed' : ''"
    :active="active"
    class-node-inline="gap-2 items-center"
    class="pl6"
    @pointerenter="enter"
  >
    <template #inner>
      <button
        class="px3 py1 hover:bg-active flex flex-inline gap-2 items-center"
        @click="emit('select', item)"
        @pointerdown="down"
      >
        <slot name="button">
          <DisplayPluginName
            v-if="'plugin_name' in item"
            :class="isDashed ? 'op50' : ''"
            :name="item.plugin_name"
            class="font-mono text-sm ws-nowrap"
          />
        </slot>
      </button>
    </template>
    <template #inline-after>
      <DisplayDuration
        v-if="'duration' in item"
        :duration="item.duration"
        :color="true"
        :factor="5"
        class="text-xs flex-shrink-0"
      />
      <template v-if="item.type === 'transform'">
        <div v-if="item.content_from === item.content_to" class="text-xs op25">
          no changes
        </div>
        <div v-else>
          <div class="font-mono text-xs flex gap-1 items-center">
            <span class="text-green">+{{ item.diff_added }}</span>
            <span class="text-red">-{{ item.diff_removed }}</span>
          </div>
        </div>
      </template>
    </template>
    <template
      v-if="item.type === 'resolve' && item.resolved_id && item.importer"
      #after
    >
      <div
        class="p3 ml4 border-l flex flex-col gap-1"
        :class="active ? 'border-flow-line-active' : 'border-flow-line'"
      >
        <div class="flex gap-2 items-center">
          <div class="i-ph-arrow-elbow-left-down text-base op50 flex-none ml0.8" />
          <DisplayModuleId
            :id="item.importer"
            :session="session"
            :link="importerModule ? true : false"
            :class="importerModule ? 'hover:bg-active' : ''"
            class="px2 py1 rounded"
          />
        </div>
        <DisplayModuleId
          :id="item.module_request"
          :session="session"
        />
      </div>
    </template>
  </FlowmapNode>
</template>
