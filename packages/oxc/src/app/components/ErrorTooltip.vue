<script setup lang="ts">
import type { Message } from '../../../src/types'
import { processLabelHtml } from '~/composables/useFileUtils'

interface Props {
  message: Message
  filename: string
  line: number
  column: number
}

const props = defineProps<Props>()

const severityBadge = computed(() => {
  return props.message.severity === 'error' ? 'badge-color-red' : 'badge-color-amber'
})

const severityIcon = computed(() => {
  return props.message.severity === 'error' ? 'i-ph-x-circle' : 'i-ph-warning-circle'
})

const rpc = useRpc()

function handleOpenInEditor() {
  rpc.value.call('devtools-oxc:open-in-editor', `${props.filename}:${props.line}:${props.column}`)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header area -->
    <div class="flex items-center gap-2 pb2 border-b border-base">
      <div
        class="flex items-center gap-2 px2 py1 rounded-md text-sm font-medium"
        :class="severityBadge"
      >
        <div :class="severityIcon" class="text-sm" />
        <span class="font-mono">{{ message.code }}</span>
      </div>
    </div>

    <!-- Message content -->
    <div
      v-if="message.message"
      class="text-sm leading-relaxed color-base"
      v-html="processLabelHtml(message.message)"
    />

    <!-- Help text -->
    <div
      v-if="message.help"
      class="flex items-start gap-2 p2 rounded-md border border-base bg-active"
    >
      <div class="i-ph-lightbulb-duotone flex-shrink-0 text-primary-500 mt-0.5" />
      <div class="text-xs op-fade leading-relaxed">
        {{ message.help }}
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-2 pt2 border-t border-base">
      <!-- Jump to the rule URL -->
      <a
        v-if="message.url"
        :href="message.url"
        target="_blank"
        class="flex items-center gap-1.5 px2 py1.5 rounded-md op-fade hover:bg-active text-xs"
      >
        <div class="i-ph-info text-sm" />
        <span>Rule details</span>
      </a>

      <!-- Open in editor -->
      <button
        class="flex items-center gap-1.5 cursor-pointer px2 py1.5 rounded-md op-fade hover:bg-active text-xs"
        @click="handleOpenInEditor"
      >
        <div class="i-radix-icons:open-in-new-window text-sm" />
        <span>Open in editor</span>
      </button>
    </div>
  </div>
</template>
