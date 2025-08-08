<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import type { PluginBuildMetrics, RolldownPluginBuildMetrics } from '../../../shared/types/data'
import { computed } from 'vue'

const props = defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
  selected?: PluginBuildMetrics['calls'][0] | null
}>()

const _emit = defineEmits<{
  (e: 'select', value: PluginBuildMetrics['calls'][0] | null): void
}>()

function normalizeMetrics(metrics: PluginBuildMetrics['calls']) {
  const info = {
    duration: 0,
    calls: metrics.length,
    modules: 0,
  }
  const seen = new Set()
  metrics.forEach((metric, index) => {
    if (!seen.has(metric.module)) {
      seen.add(metric.module)
      info.modules++
    }
    if (index === 0) {
      info.duration = metric.timestamp_start
    }
    if (index === metrics.length - 1) {
      info.duration = metric.timestamp_end - info.duration
    }
  })
  if (info.duration === 0) {
    info.duration = null!
  }
  return info
}

const resolveIdMetricsInfo = computed(() => normalizeMetrics(props.buildMetrics.resolveIdMetrics))

const loadMetricsInfo = computed(() => normalizeMetrics(props.buildMetrics.loadMetrics))

const transformMetricsInfo = computed(() => normalizeMetrics(props.buildMetrics.transformMetrics))

const startedAt = computed(() => {
  const calls = props.buildMetrics.calls
  if (!calls?.length) {
    return
  }
  return calls[0]!.timestamp_start
})

const endedAt = computed(() => {
  const calls = props.buildMetrics.calls
  if (!calls?.length) {
    return
  }
  return calls[calls.length - 1]!.timestamp_end
})
</script>

<template>
  <div select-none h-full of-auto ws-nowrap w-auto of-visible p4 flex="~ col">
    <div flex="~">
      <FlowmapNode
        :active="false"
        class-node-inner="w60"
      >
        <template #content>
          <div p2 w-full text-center>
            <DisplayPluginName
              :name="buildMetrics.plugin_name"
              class="font-mono text-sm ws-nowrap text-ellipsis line-clamp-1"
            />
          </div>
        </template>
      </FlowmapNode>
    </div>
    <div flex="~ items-center justify-center" relative w-60 h14>
      <div
        class="border-flow-line left-50% translate-x--1/2"
        absolute top-0 border="r" z-flowmap-line
        h4
      />
      <div
        class="border-flow-line left-50% translate-x--1/2"
        absolute top-10 border="r" z-flowmap-line
        h4
      />
      <span op50 text-xs flex="~ items-center justify-center gap-1" h6>
        <i i-ph:airplane-takeoff-thin text-4 inline-flex />
        <time v-if="startedAt" :datetime="new Date(startedAt).toISOString()">{{ new Date(startedAt).toLocaleString() }}</time>
      </span>
    </div>
    <FlowmapNode
      :active="false"
      class-node-inner="w60"
      class-line-bottom="left-50%! translate-x--1/2"
      pb4 w60
      :lines="{ bottom: true }"
    >
      <template #content>
        <div flex="~ col gap1" w-full>
          <span flex="~ items-center justify-center gap-1">
            <i i-ph-magnifying-glass-duotone /> Resolve Id
          </span>
          <div>
            <FlowmapNodePluginInfo
              :modules="resolveIdMetricsInfo.modules"
              :calls="resolveIdMetricsInfo.calls"
              :duration="resolveIdMetricsInfo.duration"
            />
          </div>
        </div>
      </template>
    </FlowmapNode>

    <FlowmapNode
      :active="false"
      class-node-inner="w60"
      class-line-bottom="left-50%! translate-x--1/2"
      pb4 w60
      :lines="{ bottom: true }"
    >
      <template #content>
        <div flex="~ col gap1" w-full>
          <span flex="~ items-center justify-center gap-1">
            <i i-ph-upload-simple-duotone /> Load
          </span>
          <div>
            <FlowmapNodePluginInfo
              :modules="loadMetricsInfo.modules"
              :calls="loadMetricsInfo.calls"
              :duration="loadMetricsInfo.duration"
            />
          </div>
        </div>
      </template>
    </FlowmapNode>

    <FlowmapNode
      :active="false"
      class-node-inner="w60"
      :class-node-outer="`${!transformMetricsInfo.modules && !transformMetricsInfo.calls ? `b-dashed! cursor-default!` : ''}`"
    >
      <template #content>
        <div flex="~ col gap1" w-full>
          <span flex="~ items-center justify-center gap-1">
            <i i-ph-magic-wand-duotone /> Transform
          </span>
          <div>
            <FlowmapNodePluginInfo
              :modules="transformMetricsInfo.modules"
              :calls="transformMetricsInfo.calls"
              :duration="transformMetricsInfo.duration"
            />
          </div>
        </div>
      </template>
    </FlowmapNode>
    <div flex="~ items-center justify-center" relative w-60 h14>
      <div
        class="border-flow-line left-50% translate-x--1/2"
        absolute top-0 border="r" z-flowmap-line
        h4
      />
      <div
        class="border-flow-line left-50% translate-x--1/2"
        absolute top-10 border="r" z-flowmap-line
        h4
      />
      <div
        class="border-flow-line left-50% translate-x--1/2"
        absolute top-14 w-2 h-2 border="4" rounded-full
      />
      <span op50 text-xs flex="~ items-center justify-center gap-1" h6>
        <i i-ph:airplane-landing-thin text-4 inline-flex />
        <time v-if="endedAt" :datetime="new Date(endedAt).toISOString()">{{ new Date(endedAt).toLocaleString() }}</time>
      </span>
    </div>
  </div>
</template>
