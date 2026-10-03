<script setup lang="ts">
import type { ViteFlowNode } from './NodeModuleInfo.vue'
import type { ViteModuleListItem } from '~/types/modules'
import { vOnClickOutside } from '@vueuse/components'
import { Pane, Splitpanes } from 'splitpanes'
import { shallowRef, watch } from 'vue'
import ModuleFlowDetails from './ModuleFlowDetails.vue'
import ModuleFlowTimeline from './ModuleFlowTimeline.vue'

interface FlowTransform {
  name: string
  result?: string | null
  start: number
  end: number
  order?: string
  error?: {
    message: string
  }
}

defineProps<{
  module: ViteModuleListItem
  modules: ViteModuleListItem[]
  root: string
  transforms: FlowTransform[]
  resolvedId?: string
  transformsLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', v: boolean): void
}>()

const selected = shallowRef<ViteFlowNode | null>(null)

watch(selected, (v) => {
  emit('select', !!v)
})

function handleSelect(value: ViteFlowNode | null) {
  selected.value = value
}

function handleClose() {
  selected.value = null
}
</script>

<template>
  <Splitpanes v-if="selected" class="!h-auto w-full module-flow-splitter right-4 bottom-4 fixed z-10 pointer-events-none">
    <Pane size="45" min-size="10" max-size="90" class="!h-auto pointer-events-none" />
    <Pane size="55" min-size="10" max-size="90" class="!h-auto !of-visible ">
      <!-- the origin of the height: -->
      <!-- DialogTopMargin (20) + HandleHeight (30) + padding (4*2) = 58 -->
      <div v-on-click-outside="[handleClose, { ignore: ['.splitpanes__splitter', '.flowmap-node-inline'] }]" class="w-full h-[calc(100vh-(var(--spacing)*58))] pointer-events-auto sticky top-4">
        <div class="absolute left-0 top-1/2 translate-x--1/2 translate-y--1/2 bg-#DFDFDF dark:bg-#313131 h-10 w-2 rounded-full z-10 cursor-col-resize" />
        <ModuleFlowDetails
          :selected="selected"
          @close="handleClose"
        />
      </div>
    </Pane>
  </Splitpanes>
  <div class="p4">
    <ModuleFlowTimeline
      :module="module"
      :modules="modules"
      :root="root"
      :transforms="transforms"
      :resolved-id="resolvedId"
      :transforms-loading="transformsLoading"
      :selected="selected"
      @select="handleSelect"
    />
  </div>
</template>

<style>
.module-flow-splitter>.splitpanes__splitter:before {
  background-color: transparent;
}

.splitpanes__splitter{
  pointer-events: auto;
}
</style>
