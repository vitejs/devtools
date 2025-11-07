<script setup lang="ts">
import type { DockContext } from '../webcomponents/state/dock'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { markRaw, useTemplateRef } from 'vue'
import DockEntries from '../webcomponents/components/DockEntries.vue'
import VitePlus from '../webcomponents/components/icons/VitePlus.vue'
import ViewEntry from '../webcomponents/components/ViewEntry.vue'
import { createDockContext } from '../webcomponents/state/dock'
import { useStateHandlers } from '../webcomponents/state/state'
import { PresistedDomViewsManager } from '../webcomponents/utils/PresistedDomViewsManager'

const { rpc } = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const presistedDoms = markRaw(new PresistedDomViewsManager(viewsContainer))

const context: DockContext = await createDockContext(
  'standalone',
  rpc,
)

context.selected ||= context.dockEntries[0] || null

const { selectDockEntry } = useStateHandlers(context)
</script>

<template>
  <div class="h-screen w-screen of-hidden grid cols-[max-content_1fr]">
    <div class="border-r border-base flex flex-col">
      <div class="p2 border-b border-base flex">
        <VitePlus class="w-7 h-7 ma" />
      </div>
      <DockEntries
        :entries="context.dockEntries"
        class="transition duration-200 p2"
        :is-vertical="false"
        :selected="context.selected"
        @select="selectDockEntry"
      />
    </div>
    <div>
      <div id="vite-devtools-views-container" ref="viewsContainer" />
      <ViewEntry
        v-if="context.selected && viewsContainer"
        :key="context.selected.id"
        :entry="context.selected"
        :context
        :presisted-doms="presistedDoms"
      />
    </div>
  </div>
</template>
