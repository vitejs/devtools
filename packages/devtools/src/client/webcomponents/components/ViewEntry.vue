<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { CSSProperties } from 'vue'
import type { DevToolsDockState } from './DockProps'
import type { IframeManager } from './IframeManager'
import ViewIframe from './ViewIframe.vue'

defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsDockEntry
  iframes: IframeManager
  iframeStyle?: CSSProperties
}>()
</script>

<template>
  <ViewIframe
    v-if="entry.type === 'iframe'"
    :state="state"
    :is-dragging="isDragging"
    :is-resizing="isResizing"
    :entry="entry"
    :iframes="iframes"
    :iframe-style="iframeStyle"
  />
  <div v-else>
    Unknown entry: {{ entry }}
  </div>
</template>
