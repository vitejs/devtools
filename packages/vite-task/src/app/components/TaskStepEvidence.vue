<script setup lang="ts">
import type { CommandStep } from '../../shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayHighlightedPath from '@vitejs/devtools-ui/components/Display/DisplayHighlightedPath'
import { computed } from 'vue'
import { cacheChangeHue } from '../utils/task-plan'
import TaskCommand from './TaskCommand.vue'

const props = defineProps<{ step: CommandStep, active: boolean, terminal?: boolean }>()
const change = computed(() => props.step.cache?.changes?.[0])
const input = computed(() => Object.keys(props.step.cache?.baseline?.fingerprint?.inputs ?? {})[0])
</script>

<template>
  <div class="p3 ml4 border-l flex flex-col gap1" :class="terminal ? 'border-transparent' : active ? 'border-flow-line-active' : 'border-flow-line'">
    <div class="flex items-center gap2">
      <i class="i-ph-arrow-elbow-left-down op50 shrink-0" />
      <TaskCommand :step="step" />
      <slot />
    </div>
    <div v-if="change" class="flex items-center gap2 text-sm">
      <i class="i-ph-cube-duotone text-teal shrink-0" />
      <code class="break-all">
        <DisplayHighlightedPath v-if="change.path" :path="change.path" />
        <template v-else>{{ change.name || change.setting || change.kind }}</template>
      </code>
      <DisplayBadge v-if="change.change" :text="change.change" :color="cacheChangeHue(change.change)" />
    </div>
    <div v-else-if="step.cache?.message" class="text-sm break-words">
      {{ step.cache.message }}
    </div>
    <div v-else-if="input || step.cwd" class="flex items-center gap2 text-sm font-mono" :title="input ? 'Cached input' : 'Working directory'">
      <i :class="input ? 'i-ph-cube-duotone text-teal' : 'i-ph-folder-duotone op50'" class="shrink-0" />
      <span class="sr-only">{{ input ? 'Cached input' : 'Working directory' }}</span>
      <code class="break-all"><DisplayHighlightedPath :path="input || step.cwd!" /></code>
    </div>
  </div>
</template>
