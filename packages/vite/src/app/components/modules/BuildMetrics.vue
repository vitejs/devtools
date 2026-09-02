<script setup lang="ts">
import type { ViteModuleBuildMetrics } from '~/types/modules'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import { formatDuration } from '@vitejs/devtools-ui/utils/format'
import { computed } from 'vue'

const props = defineProps<{
  metrics: ViteModuleBuildMetrics
}>()

const durations = computed(() => {
  const data = props.metrics
  const _resolveIds = data.resolve_ids.reduce((t, node) => t + node.duration, 0)
  const _loads = data.loads.reduce((t, node) => t + node.duration, 0)
  const _transforms = data.transforms.reduce((t, node) => t + node.duration, 0)
  const total = _resolveIds + _loads + _transforms
  return {
    resolveIds: _resolveIds,
    loads: _loads,
    transforms: _transforms,
    total,
  }
})

const sourceCodeSize = computed(() => props.metrics.transforms[0]?.source_code_size)

const transformedCodeSize = computed(() => {
  const data = props.metrics.transforms.filter(t => t.transformed_code_size)
  return data.at(-1)?.transformed_code_size
})
</script>

<template>
  <div class="text-xs font-mono flex items-center gap-3 ml2">
    <DisplayDuration
      :duration="durations.resolveIds" class="flex gap-1 items-center"
      :title="`Resolve Id hooks cost: ${formatDuration(durations.resolveIds, true)}`"
    >
      <span class="i-ph-magnifying-glass-duotone inline-block" />
    </DisplayDuration>
    <DisplayDuration
      :duration="durations.loads" class="flex gap-1 items-center"
      :title="`Load hooks cost: ${formatDuration(durations.loads, true)}`"
    >
      <span class="i-ph-upload-simple-duotone inline-block" />
    </DisplayDuration>
    <DisplayDuration
      :duration="durations.transforms" class="flex gap-1 items-center"
      :title="`Transform hooks cost: ${formatDuration(durations.transforms, true)}`"
    >
      <span class="i-ph-magic-wand-duotone inline-block" />
    </DisplayDuration>
    <span class="op40">|</span>
    <DisplayDuration
      :duration="durations.total" class="flex gap-1 items-center"
      :title="`Total build cost: ${formatDuration(durations.total, true)}`"
    >
      <span class="i-ph-clock-duotone inline-block" />
    </DisplayDuration>
    <template v-if="sourceCodeSize && transformedCodeSize">
      <span class="op40">|</span>
      <div class="flex gap-1 items-center">
        <DisplayFileSizeBadge title="Source code size" :bytes="sourceCodeSize" />
        <span class="i-ph-arrow-right-duotone op50" />
        <DisplayFileSizeBadge title="Transformed code size" :bytes="transformedCodeSize" />
      </div>
    </template>
  </div>
</template>
