<script setup lang="ts">
import type { ModuleBuildMetrics } from '~~/shared/types'
import { computed } from 'vue'

const props = defineProps<{
  metrics: ModuleBuildMetrics
}>()

const durations = computed(() => {
  const data = props.metrics
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
  const data = props.metrics?.transforms
  return data?.[0]?.source_code_size
})

const transformedCodeSize = computed(() => {
  const data = props.metrics?.transforms.filter(t => t.transformed_code_size)
  return data?.[data.length - 1]?.transformed_code_size
})
</script>

<template>
  <div text-xs font-mono flex="~ items-center gap-3" ml2>
    <DisplayDuration
      :duration="durations.resolveIds" flex="~ gap-1 items-center"
      :title="`Resolve Id hooks cost: ${durations.resolveIds}ms`"
    >
      <span i-ph-magnifying-glass-duotone inline-block />
    </DisplayDuration>
    <DisplayDuration
      :duration="durations.loads" flex="~ gap-1 items-center"
      :title="`Load hooks cost: ${durations.loads}ms`"
    >
      <span i-ph-upload-simple-duotone inline-block />
    </DisplayDuration>
    <DisplayDuration
      :duration="durations.transforms" flex="~ gap-1 items-center"
      :title="`Transform hooks cost: ${durations.transforms}ms`"
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
    <template v-if="sourceCodeSize && transformedCodeSize">
      <span op40>|</span>
      <div flex="~ gap-1 items-center">
        <DisplayFileSizeBadge title="Source code size" :bytes="sourceCodeSize" />
        <span i-carbon-arrow-right op50 />
        <DisplayFileSizeBadge title="Transformed code size" :bytes="transformedCodeSize" />
      </div>
    </template>
  </div>
</template>

<style scoped>

</style>
