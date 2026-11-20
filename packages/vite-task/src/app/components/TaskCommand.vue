<script setup lang="ts">
import type { CommandStep } from '../../shared/types'
import DisplayHighlightedPath from '@vitejs/devtools-ui/components/Display/DisplayHighlightedPath'
import { Tooltip } from 'floating-vue'
import { computed } from 'vue'
import { programName } from '../utils/task-plan'
import TaskFilePath from './TaskFilePath.vue'

const props = defineProps<{ step: CommandStep, inspectExecutable?: boolean }>()
const programColor = 'color-scale-medium'
const name = computed(() => programName(props.step.program))
const path = computed(() => props.inspectExecutable && name.value !== props.step.program ? props.step.program : undefined)
</script>

<template>
  <div class="font-mono text-sm" :class="{ 'whitespace-pre-wrap break-all': !inspectExecutable }">
    <Tooltip v-if="path" class="inline-block" placement="bottom-start" popper-class="task-program-path">
      <span tabindex="0" class="cursor-help underline decoration-dotted underline-offset-3" :class="programColor">{{ name }}</span>
      <template #popper>
        <TaskFilePath :path="path" :filename-class="programColor" />
      </template>
    </Tooltip><span v-else :class="programColor" :title="inspectExecutable ? undefined : step.program">{{ name }}</span><template v-for="(arg, i) in step.args" :key="i">
      {{ ' ' }}<span class="op75"><DisplayHighlightedPath v-if="/^(?:\.{0,2}\/|[A-Z]:[\\/])/i.test(arg)" :path="arg" /><template v-else>{{ arg }}</template></span>
    </template>
  </div>
</template>
