<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { markRaw, useTemplateRef } from 'vue'
import DockEntries from '../webcomponents/components/DockEntries.vue'
import VitePlus from '../webcomponents/components/icons/VitePlus.vue'
import ViewEntry from '../webcomponents/components/ViewEntry.vue'
import { createDocksContext } from '../webcomponents/state/context'
import { PersistedDomViewsManager } from '../webcomponents/utils/PersistedDomViewsManager'

const rpcReturn = await getDevToolsRpcClient()
const { rpc } = rpcReturn

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const persistedDoms = markRaw(new PersistedDomViewsManager(viewsContainer))

const context: DocksContext = await createDocksContext(
  'standalone',
  rpcReturn,
)

context.docks.selectedId ||= context.docks.entries[0]?.id ?? null
</script>

<template>
  <div class="h-screen w-screen of-hidden grid cols-[max-content_1fr]">
    <div class="border-r border-base flex flex-col">
      <div class="p2 border-b border-base flex">
        <VitePlus class="w-7 h-7 ma" />
      </div>
      <DockEntries
        :entries="context.docks.entries"
        class="transition duration-200 p2"
        :is-vertical="false"
        :selected="context.docks.selected"
        @select="(e) => context.docks.switchEntry(e?.id)"
      />
    </div>
    <div>
      <div id="vite-devtools-views-container" ref="viewsContainer" class="pointer-events-auto" />
      <ViewEntry
        v-if="context.docks.selected && viewsContainer"
        :key="context.docks.selected.id"
        :entry="context.docks.selected"
        :context
        :persisted-doms="persistedDoms"
      />
    </div>
  </div>
</template>
