<script setup lang="ts">
import type { DevToolsLogEntry } from '@vitejs/devtools-kit'
import { useTimeAgo } from '@vueuse/core'
import HashBadge from '../display/HashBadge.vue'
import { levels } from './LogItemConstants'

const props = defineProps<{
  entry: DevToolsLogEntry
  compact?: boolean
}>()

const timeAgo = useTimeAgo(() => props.entry.timestamp)
</script>

<template>
  <div class="flex items-start gap-2 relative">
    <div class="w-2px flex-none absolute left-0 top-4px bottom-4px rounded-r" :class="[levels[entry.level]?.bg || 'bg-gray']" />

    <div
      v-if="entry.status === 'loading'"
      class="flex-none mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin op50 w-4 h-4"
    />
    <div
      v-else
      class="flex-none mt-0.5 w-4 h-4"
      :class="[levels[entry.level]?.icon, levels[entry.level]?.color]"
    />

    <div class="flex-1 min-w-0">
      <div class="truncate text-sm font-medium" :class="[entry.status === 'loading' ? 'op60' : '']">
        {{ entry.message }}
      </div>
      <div v-if="entry.description" class="text-xs op80 mt-0.5 whitespace-pre-wrap">
        {{ entry.description }}
      </div>
      <div v-if="!compact" class="flex items-center gap-2 mt-0.5">
        <HashBadge v-if="entry.category" :label="entry.category" />
        <HashBadge v-for="label of entry.labels" :key="label" :label="label" />
      </div>
    </div>
    <span v-if="!compact" class="text-xs op40 flex-none" :title="new Date(entry.timestamp).toLocaleString()">{{ timeAgo }}</span>
    <slot name="actions" />
  </div>
</template>
