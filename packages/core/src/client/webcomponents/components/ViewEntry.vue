<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { CSSProperties } from 'vue'
import type { DevToolsDockState } from '../types/DockProps'
import type { PresistedDomViewsManager } from '../utils/PresistedDomViewsManager'
import ViewIframe from './ViewIframe.vue'

defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsDockEntry
  presistedDoms: PresistedDomViewsManager
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
    :presisted-doms="presistedDoms"
    :iframe-style="iframeStyle"
  />
  <div v-else>
    Unknown entry: {{ entry }}
  </div>
</template>
