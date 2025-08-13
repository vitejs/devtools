<script setup lang="ts">
import type { ModuleInfo, RolldownChunkInfo, RolldownModuleFlowNode, SessionContext } from '~~/shared/types'
import { vOnClickOutside } from '@vueuse/components'
import { Pane, Splitpanes } from 'splitpanes'
import { shallowRef, toRefs, watch } from 'vue'
import ModuleFlowDetails from './ModuleFlowDetails.vue'
import ModuleFlowTimeline from './ModuleFlowTimeline.vue'

const props = defineProps<{
  info: ModuleInfo
  session: SessionContext
  transformsLoading: boolean
}>()
const emit = defineEmits<{
  (e: 'select', v: boolean): void
}>()
const { info } = toRefs(props)

const selected = shallowRef<RolldownChunkInfo | RolldownModuleFlowNode | null>(null)

watch(selected, (v) => {
  emit('select', !!v)
})

function handleSelect(value: RolldownModuleFlowNode | null) {
  selected.value = value
}

function handleClose() {
  selected.value = null
}
</script>

<template>
  <Splitpanes class="!h-auto !of-visible p4 module-flow-splitter">
    <Pane size="45" min-size="10" max-size="90" class="!h-auto !of-visible">
      <ModuleFlowTimeline
        :info="info"
        :session="session"
        :transforms-loading="transformsLoading"
        :selected="selected"
        @select="handleSelect"
      />
    </Pane>

    <Pane v-if="selected" size="55" min-size="10" max-size="90" class="!h-auto !of-visible">
      <!-- the origin of the height: -->
      <!-- DialogTopMargin (20) + HandleHeight (30) + padding (4*2) = 58 -->
      <div v-on-click-outside="[handleClose, { ignore: ['.splitpanes__splitter', '.flowmap-node-inline'] }]" w-full h="[calc(100vh-(var(--spacing)*58))]" sticky top-4>
        <div absolute left-0 top="1/2" translate-x="-1/2" translate-y="-1/2" bg="#DFDFDF dark:#313131" h-10 w-2 rounded-full z-10 cursor-col-resize />
        <ModuleFlowDetails
          :selected="selected"
          :session="session"
          @close="handleClose"
        />
      </div>
    </Pane>
  </Splitpanes>
</template>

<style>
.module-flow-splitter>.splitpanes__splitter:before {
  background-color: transparent;
}
</style>
