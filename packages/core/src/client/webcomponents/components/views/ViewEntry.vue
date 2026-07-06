<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { IframePanes } from 'iframe-pane'
import type { CSSProperties } from 'vue'
import { defineAsyncComponent } from 'vue'
import ViewBuiltinClientAuthNotice from '../views-builtin/ViewBuiltinClientAuthNotice.vue'
import ViewBuiltinSettings from '../views-builtin/ViewBuiltinSettings.vue'
import ViewCustomRenderer from './ViewCustomRenderer.vue'
import ViewIframe from './ViewIframe.vue'
import ViewLauncher from './ViewLauncher.vue'

defineProps<{
  context: DocksContext
  entry: DevToolsDockEntry
  panes: IframePanes
  iframeStyle?: CSSProperties
  divStyle?: CSSProperties
}>()

// Lazy load some less frequently used builtin views
const ViewBuiltinTerminals = defineAsyncComponent(() => import('../views-builtin/ViewBuiltinTerminals.vue'))
const ViewBuiltinMessages = defineAsyncComponent(() => import('../views-builtin/ViewBuiltinMessages.vue'))
const ViewJsonRender = defineAsyncComponent(() => import('./ViewJsonRender.vue'))
</script>

<template>
  <Suspense>
    <template v-if="entry.type === '~builtin'">
      <ViewBuiltinTerminals
        v-if="entry.id === '~terminals'"
        :context
        :entry
      />
      <ViewBuiltinMessages
        v-else-if="entry.id === '~messages'"
        :context
        :entry
      />
      <ViewBuiltinSettings
        v-else-if="entry.id === '~settings'"
        :context
        :entry
      />
      <ViewBuiltinClientAuthNotice
        v-else-if="entry.id === '~client-auth-notice'"
        :context
      />
      <div v-else>
        Unknown builtin entry: {{ entry }}
      </div>
    </template>

    <!-- Entry for Actions -->
    <template v-else-if="entry.type === 'action'" />

    <!-- User-defined entries -->
    <ViewIframe
      v-else-if="entry.type === 'iframe'"
      :context
      :entry
      :panes="panes"
      :iframe-style="iframeStyle"
    />
    <ViewCustomRenderer
      v-else-if="entry.type === 'custom-render'"
      :context
      :entry
      :panes="panes"
      :div-style="divStyle"
    />
    <ViewLauncher
      v-else-if="entry.type === 'launcher'"
      :context
      :entry
    />
    <ViewJsonRender
      v-else-if="entry.type === 'json-render'"
      :context
      :entry
    />
    <div v-else>
      Unknown entry: {{ entry }}
    </div>

    <template #fallback>
      <div>
        Loading...
      </div>
    </template>
  </Suspense>
</template>
