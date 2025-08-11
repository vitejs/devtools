<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'

const props = defineProps<{
  session: SessionContext
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    const res = await rpc.value!['vite:rolldown:get-plugin-details']?.({
      session: props.session.id,
      id: route.query.plugin as string,
    })
    return res
  },
  null,
)

const processedModules = computed(() => {
  const seen = new Set()
  return state.value?.calls?.filter((call) => {
    if (seen.has(call.module)) {
      return false
    }
    seen.add(call.module)
    return true
  }) ?? []
})

const hookLoadDuration = computed(() => {
  const loadMetrics = state.value?.loadMetrics
  if (!loadMetrics?.length) {
    return
  }
  return loadMetrics[loadMetrics.length - 1]!.timestamp_end - loadMetrics[0]!.timestamp_start
})

const hookTransformDuration = computed(() => {
  const transformMetrics = state.value?.transformMetrics
  if (!transformMetrics?.length) {
    return
  }
  return transformMetrics[transformMetrics.length - 1]!.timestamp_end - transformMetrics[0]!.timestamp_start
})

const hookResolveIdDuration = computed(() => {
  const resolveIdMetrics = state.value?.resolveIdMetrics
  if (!resolveIdMetrics?.length) {
    return
  }
  return resolveIdMetrics[resolveIdMetrics.length - 1]!.timestamp_end - resolveIdMetrics[0]!.timestamp_start
})

const totalDuration = computed(() => {
  const calls = state.value?.calls
  if (!calls?.length) {
    return
  }
  return calls[calls.length - 1]!.timestamp_end - calls[0]!.timestamp_start
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else-if="state?.calls?.length" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <DisplayPluginName :name="state?.plugin_name!" />
      <div text-xs font-mono flex="~ items-center gap-3" ml2>
        <DisplayDuration
          :duration="hookResolveIdDuration" flex="~ gap-1 items-center"
          :title="`Resolve Id hooks cost: ${hookResolveIdDuration}ms`"
        >
          <span i-ph-magnifying-glass-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookLoadDuration" flex="~ gap-1 items-center"
          :title="`Load hooks cost: ${hookLoadDuration}ms`"
        >
          <span i-ph-upload-simple-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookTransformDuration" flex="~ gap-1 items-center"
          :title="`Transform hooks cost: ${hookTransformDuration}ms`"
        >
          <span i-ph-magic-wand-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayDuration
          :duration="totalDuration" flex="~ gap-1 items-center"
          :title="`Total build cost: ${totalDuration}ms`"
        >
          <span i-ph-clock-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayNumberBadge
          :number="processedModules.length" icon="i-catppuccin-java-class-abstract"
          color="transparent color-scale-neutral"
          :title="`Module processed: ${processedModules.length}`"
        />
        <span op40>|</span>
        <DisplayNumberBadge
          :number="state?.calls?.length ?? 0" icon="i-ph:arrow-counter-clockwise"
          color="transparent color-scale-neutral"
          :title="`Total calls: ${state?.calls?.length ?? 0}`"
        />
      </div>
      <div flex="~ gap-2">
        <button
          :class="settings.pluginDetailsViewType === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="settings.pluginDetailsViewType === 'charts' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'charts'"
        >
          <div i-ph-chart-donut-duotone />
          Charts
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <FlowmapPluginFlow
        v-if="settings.pluginDetailsViewType === 'flow'"
        :session="session"
        :build-metrics="state"
      />
    </div>
  </div>
  <div v-else flex="~ items-center justify-center" w-full h-full>
    <span italic op50>
      No data
    </span>
  </div>
</template>
