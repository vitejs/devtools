<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '../../../shared/types/data'

defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()
</script>

<template>
  <div p2 h-full w-full>
    <div flex="~" border="~ base" rounded-2 h-full>
      <div p2 of-hidden border="r base">
        <FlowmapPluginFlowTimeline
          :session="session"
          :build-metrics="buildMetrics"
        />
      </div>
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
