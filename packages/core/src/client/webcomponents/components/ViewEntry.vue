<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { PresistedDomViewsManager } from '../utils/PresistedDomViewsManager'
import ViewCustomRenderer from './ViewCustomRenderer.vue'
import ViewIframe from './ViewIframe.vue'
import ViewLauncher from './ViewLauncher.vue'

defineProps<{
  context: DocksContext
  entry: DevToolsDockEntry
  presistedDoms: PresistedDomViewsManager
  iframeStyle?: CSSProperties
  divStyle?: CSSProperties
}>()
</script>

<template>
  <template v-if="entry.type === 'action'" />
  <ViewIframe
    v-else-if="entry.type === 'iframe'"
    :context
    :entry
    :presisted-doms="presistedDoms"
    :iframe-style="iframeStyle"
  />
  <ViewCustomRenderer
    v-else-if="entry.type === 'custom-render'"
    :context
    :entry
    :presisted-doms="presistedDoms"
    :div-style="divStyle"
  />
  <ViewLauncher
    v-else-if="entry.type === 'launcher'"
    :context
    :entry
  />
  <div v-else>
    Unknown entry: {{ entry }}
  </div>
</template>
