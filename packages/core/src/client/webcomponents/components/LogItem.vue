<script setup lang="ts">
import type { DevToolsLogEntry, DevToolsLogLevel } from '@vitejs/devtools-kit'
import DockIcon from './DockIcon.vue'

// @unocss-include

defineProps<{
  entry: DevToolsLogEntry
  compact?: boolean
}>()

const levelIcons: Record<DevToolsLogLevel, string> = {
  info: 'ph:info-duotone',
  warn: 'ph:warning-duotone',
  error: 'ph:x-circle-duotone',
  success: 'ph:check-circle-duotone',
  debug: 'ph:bug-duotone',
}

const levelIndicatorColors: Record<DevToolsLogLevel, string> = {
  info: 'bg-blue',
  warn: 'bg-amber',
  error: 'bg-red',
  success: 'bg-green',
  debug: 'bg-gray',
}

const levelColors: Record<DevToolsLogLevel, string> = {
  info: 'text-blue',
  warn: 'text-amber',
  error: 'text-red',
  success: 'text-green',
  debug: 'text-gray',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}
</script>

<template>
  <div class="flex items-start gap-2 relative">
    <div class="w-2px flex-none absolute left-0 top-4px bottom-4px rounded-r" :class="[levelIndicatorColors[entry.level] || 'bg-gray']" />

    <div
      v-if="entry.status === 'loading'"
      class="flex-none mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin op50 w-4 h-4"
    />
    <DockIcon
      v-else
      :icon="levelIcons[entry.level]"
      class="flex-none mt-0.5 w-4 h-4"
      :class="[levelColors[entry.level]]"
    />

    <div class="flex-1 min-w-0">
      <div class="truncate text-sm font-medium" :class="[entry.status === 'loading' ? 'op60' : '']">
        {{ entry.message }}
      </div>
      <div v-if="entry.description" class="text-xs op80 mt-0.5 whitespace-pre-wrap">
        {{ entry.description }}
      </div>
      <div v-if="!compact" class="flex items-center gap-2 mt-0.5">
        <span v-if="entry.category" class="text-xs bg-gray/10 px-1 rounded">{{ entry.category }}</span>
        <span
          v-for="label of entry.labels"
          :key="label"
          class="text-xs bg-purple/10 text-purple px-1 rounded"
        >{{ label }}</span>
      </div>
    </div>
    <span v-if="!compact" class="text-xs op40 flex-none">{{ formatTime(entry.timestamp) }}</span>
    <slot name="actions" />
  </div>
</template>
