<script setup lang="ts">
import type { ModuleInfo, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { computedAsync } from '@vueuse/core'
import { computed, nextTick, ref, watchEffect } from 'vue'
import { settings } from '~~/app/state/settings'
import { getContentByteSize } from '~~/app/utils/format'

const props = defineProps<{
  session: SessionContext
  module: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rpc = useRpc()
const transforms = ref<RolldownModuleTransformInfo[]>([])
const transformsLoading = ref(false)
const flowNodeSelected = ref(false)

watchEffect(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  // fetch transforms in the next tick to avoid race conditions with module info
  nextTick(async () => {
    transforms.value = []
    transformsLoading.value = true
    transforms.value = await rpc.value!['vite:rolldown:get-module-transforms']?.(arg)
    transformsLoading.value = false
  })
})

const info = computedAsync(async () => {
  const arg = {
    session: props.session.id,
    module: props.module,
  }
  return {
    transforms: transforms.value,
    ...(await rpc.value!['vite:rolldown:get-module-info']?.(arg)),
  } as ModuleInfo
})

const durations = computed(() => {
  const data = info.value
  const _resolveIds = data?.resolve_ids.reduce((t, node) => {
    t += node.duration
    return t
  }, 0) ?? 0
  const _loads = data?.loads?.reduce((t, node) => {
    t += node.duration
    return t
  }, 0) ?? 0
  const _transforms = data?.transforms.reduce((t, node) => {
    t += node.duration
    return t
  }, 0) ?? 0
  const total = _resolveIds + _loads + _transforms
  return {
    resolveIds: _resolveIds,
    loads: _loads,
    transforms: _transforms,
    total,
  }
})

const sourceCodeSize = computed(() => {
  const data = info.value?.transforms
  const source = data?.[0]?.content_from ?? ''
  return getContentByteSize(source)
})

const transformedCodeSize = computed(() => {
  const data = info.value?.transforms?.filter(t => t.content_to)?.reverse()
  const source = data?.[0]?.content_to ?? ''
  return getContentByteSize(source)
})

function selectFlowNode(v: boolean) {
  flowNodeSelected.value = v
}
</script>

<template>
  <div v-if="info" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5 bg-glass z-panel-content
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <DisplayModuleId :id="module" px2 pt1 :session />
      <div text-xs font-mono flex="~ items-center gap-3" ml2>
        <DisplayDuration
          :duration="durations.resolveIds" flex="~ gap-1 items-center"
          :title="`resolveId hooks cost: ${durations.resolveIds}ms`"
        >
          <span i-ph-magnifying-glass-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="durations.loads" flex="~ gap-1 items-center"
          :title="`load hooks cost: ${durations.loads}ms`"
        >
          <span i-ph-upload-simple-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="durations.transforms" flex="~ gap-1 items-center"
          :title="`transform hooks cost: ${durations.transforms}ms`"
        >
          <span i-ph-magic-wand-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayDuration
          :duration="durations.total" flex="~ gap-1 items-center"
          :title="`Total build cost: ${durations.total}ms`"
        >
          <span i-ph-clock-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <div flex="~ gap-1 items-center">
          <DisplayFileSizeBadge title="Source code size" :bytes="sourceCodeSize" />
          <span i-carbon-arrow-right op50 />
          <DisplayFileSizeBadge title="Transformed code size" :bytes="transformedCodeSize" />
        </div>
      </div>
      <div flex="~ gap-2">
        <button
          :class="settings.moduleDetailsViewType === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.moduleDetailsViewType = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="settings.moduleDetailsViewType === 'charts' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.moduleDetailsViewType = 'charts'"
        >
          <div i-ph-chart-donut-duotone />
          Charts
        </button>
        <button
          :class="settings.moduleDetailsViewType === 'imports' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.moduleDetailsViewType = 'imports'"
        >
          <div i-ph-graph-duotone />
          Imports
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <FlowmapModuleFlow
        v-if="settings.moduleDetailsViewType === 'flow'"
        p4
        :info
        :session
        :transforms-loading
        @select="selectFlowNode"
      />
      <ChartModuleFlamegraph
        v-if="settings.moduleDetailsViewType === 'charts'"
        :info
        :session="session"
        :flow-node-selected="flowNodeSelected"
      />
      <DataModuleImportRelationships
        v-if="settings.moduleDetailsViewType === 'imports'"
        :module="info"
        :session="session"
      />
    </div>
  </div>
  <VisualLoading v-else />
</template>
