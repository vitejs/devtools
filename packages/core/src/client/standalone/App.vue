<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { computed, markRaw, ref, useTemplateRef, watch } from 'vue'
import DockEntriesWithCategories from '../webcomponents/components/DockEntriesWithCategories.vue'
import FloatingElements from '../webcomponents/components/FloatingElements.vue'
import VitePlus from '../webcomponents/components/icons/VitePlus.vue'
import ViewBuiltinClientAuthNotice from '../webcomponents/components/ViewBuiltinClientAuthNotice.vue'
import ViewEntry from '../webcomponents/components/ViewEntry.vue'
import { createDocksContext } from '../webcomponents/state/context'
import { groupDockEntries } from '../webcomponents/state/dock-settings'
import { sharedStateToRef } from '../webcomponents/state/docks'
import { PersistedDomViewsManager } from '../webcomponents/utils/PersistedDomViewsManager'

const rpc = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const persistedDoms = markRaw(new PersistedDomViewsManager(viewsContainer))

const context: DocksContext = await createDocksContext(
  'standalone',
  rpc,
)

const isRpcTrusted = ref(context.rpc.isTrusted)
context.rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
  isRpcTrusted.value = isTrusted
})

// Load settings from context
const settingsStore = await context.docks.getSettingsStore()
const settings = sharedStateToRef(settingsStore)

watch(
  () => context.docks.entries,
  () => {
    context.docks.selectedId ||= context.docks.entries[0]?.id ?? null
  },
  { immediate: true },
)

const groupedEntries = computed(() => {
  return groupDockEntries(context.docks.entries, settings.value)
})

function switchEntry(id: string) {
  if (id) {
    context.docks.switchEntry(id)
  }
}
</script>

<template>
  <div v-if="!isRpcTrusted" class="h-screen w-screen of-hidden">
    <ViewBuiltinClientAuthNotice :context="context" />
  </div>
  <div v-else class="h-screen w-screen of-hidden grid cols-[max-content_1fr]">
    <div class="border-r border-base flex flex-col">
      <div class="p2 border-b border-base flex">
        <VitePlus class="w-7 h-7 ma" />
      </div>
      <div class="transition duration-200 p2">
        <DockEntriesWithCategories
          :context="context"
          :groups="groupedEntries"
          :is-vertical="false"
          :selected="context.docks.selected"
          @select="(e) => switchEntry(e?.id)"
        >
          <template #separator>
            <div class="border-base border-b w-full my-2" />
          </template>
        </DockEntriesWithCategories>
      </div>
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
  <FloatingElements />
</template>
