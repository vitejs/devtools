<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useLogs } from '../state/logs'
import { dismissToast, useToasts } from '../state/toasts'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context?: DocksContext
}>()

// Initialize logs state early so the RPC handler is registered
// and toasts are triggered even before the logs panel is opened
if (props.context)
  useLogs(props.context)

const toasts = useToasts()

const levelColors: Record<string, string> = {
  info: 'border-blue',
  warn: 'border-amber',
  error: 'border-red',
  success: 'border-green',
  debug: 'border-gray',
}

const levelIcons: Record<string, string> = {
  info: 'ph:info-duotone',
  warn: 'ph:warning-duotone',
  error: 'ph:x-circle-duotone',
  success: 'ph:check-circle-duotone',
  debug: 'ph:bug-duotone',
}

function openLogs(toastId: string) {
  dismissToast(toastId)
  props.context?.docks.switchEntry('~logs')
}
</script>

<template>
  <div
    v-if="toasts.length > 0"
    class="fixed bottom-4 right-4 z-2147483647 flex flex-col gap-2 pointer-events-auto max-w-80"
  >
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 translate-x-4"
      leave-to-class="opacity-0 translate-x-4"
    >
      <div
        v-for="toast of toasts"
        :key="toast.id"
        class="bg-base border border-base rounded-lg shadow-lg flex items-start gap-2 px-3 py-2 border-l-3 cursor-pointer"
        :class="levelColors[toast.entry.level] || 'border-gray'"
        @click="openLogs(toast.id)"
      >
        <DockIcon
          v-if="toast.entry.status !== 'loading'"
          :icon="levelIcons[toast.entry.level] || 'ph:info-duotone'"
          class="w-4 h-4 flex-none mt-0.5"
        />
        <div
          v-else
          class="w-4 h-4 flex-none mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin op50"
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">
            {{ toast.entry.message }}
          </div>
          <div v-if="toast.entry.source" class="text-xs op50 truncate">
            {{ toast.entry.source }}
          </div>
        </div>
        <button
          class="flex-none op50 hover:op100 p-0.5"
          @click.stop="dismissToast(toast.id)"
        >
          <DockIcon icon="ph:x" class="w-3 h-3" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
