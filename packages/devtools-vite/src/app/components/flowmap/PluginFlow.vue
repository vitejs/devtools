<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '../../../shared/types/data'
import { useToggle } from '@vueuse/core'

defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()

const [expanded, toggleExpanded] = useToggle(true)
</script>

<template>
  <div p2 h-full w-full>
    <div flex="~" border="~ base" rounded-2 h-full relative of-hidden>
      <div v-if="expanded" of-hidden border="r base">
        <FlowmapPluginFlowTimeline
          :session="session"
          :build-metrics="buildMetrics"
        >
          <button w-7 h-7 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center" @click="toggleExpanded(false)">
            <i i-fluent:panel-right-expand-20-regular inline-flex op50 />
          </button>
        </FlowmapPluginFlowTimeline>
      </div>
      <button v-else inline-flex absolute z1 left--1 class="top-1/2 translate-y--1/2" border="~ base" rounded-r-4 p1 hover="bg-active" @click="toggleExpanded(true)">
        <i i-fluent:panel-left-expand-20-regular cursor-pointer op-50 text-4 />
      </button>
      <div flex-1 of-y-scroll h-full>
        <div>
          <DataPluginDetailsTable
            :session="session"
            :build-metrics="buildMetrics"
          />
        </div>
      </div>
    </div>
  </div>
</template>
