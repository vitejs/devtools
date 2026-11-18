<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ path: string, filenameClass?: string, compact?: boolean }>()
const segments = computed(() => props.path.split(/(?<=[/\\])/))
</script>

<template>
  <code v-if="compact" class="flex max-w-full min-w-0" :title="path">
    <span class="truncate op65">{{ segments.slice(0, -1).join('') }}</span><span class="max-w-full shrink-0 truncate" :class="filenameClass">{{ segments.at(-1) }}</span>
  </code>
  <code v-else class="min-w-0 [overflow-wrap:anywhere]" :title="path"><template v-for="(segment, i) in segments" :key="i"><span :class="i < segments.length - 1 ? 'op65' : filenameClass">{{ segment }}</span><wbr v-if="i < segments.length - 1"></template></code>
</template>
