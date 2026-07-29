<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { selectMessage, useMessages } from '../../state/messages'
import { dismissToast, useToasts } from '../../state/toasts'
import MessageItem from '../message/MessageItem.vue'

const props = defineProps<{
  context?: DocksContext
}>()

// Initialize messages state early so the RPC handler is registered
// and toasts are triggered even before the messages panel is opened
if (props.context)
  useMessages(props.context)

const toasts = useToasts()

function openMessages(toastId: string) {
  dismissToast(toastId)
  selectMessage(toastId)
  // Open the messages panel provided by `@devframes/plugin-messages`
  // (its dock id is the plugin's devframe id).
  props.context?.docks.switchEntry('devframes-plugin-messages')
}
</script>

<template>
  <div
    v-if="toasts.length > 0"
    class="fixed bottom-4 right-4 z-2147483647 flex flex-col gap-2 pointer-events-auto w-72"
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
        class="bg-glass border color-base border-base shadow-xl cursor-pointer hover:bg-active transition-colors rounded"
        @click="openMessages(toast.id)"
      >
        <MessageItem :entry="toast.entry" compact class="px-3 py-2.5">
          <template #actions>
            <button
              class="flex-none op30 hover:op100 p-0.5 rounded hover:bg-active transition"
              @click.stop="dismissToast(toast.id)"
            >
              <div class="i-ph-x w-3 h-3" />
            </button>
          </template>
        </MessageItem>
      </div>
    </TransitionGroup>
  </div>
</template>
