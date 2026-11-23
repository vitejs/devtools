<script setup lang="ts">
import type { CommandStep } from '../../shared/types'
import DisplayHighlightedPath from '@vitejs/devtools-ui/components/Display/DisplayHighlightedPath'
import { computed } from 'vue'
import { programName } from '../utils/task-plan'

const props = defineProps<{ step: CommandStep, singleLine?: boolean }>()
const name = computed(() => programName(props.step.program))
</script>

<template>
  <div class="font-mono text-sm" :class="{ 'truncate': singleLine, 'whitespace-pre-wrap break-all': !singleLine }" :title="singleLine ? [step.program, ...(step.args ?? [])].join(' ') : undefined">
    <span class="color-scale-medium" :title="singleLine ? undefined : step.program">{{ name }}</span><template v-for="(arg, i) in step.args" :key="i">
      {{ ' ' }}<span class="op75"><DisplayHighlightedPath v-if="/^(?:\.{0,2}\/|[A-Z]:[\\/])/i.test(arg)" :path="arg" /><template v-else>{{ arg }}</template></span>
    </template>
  </div>
</template>
