<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, markRaw, ref, useTemplateRef, watch } from 'vue'
import { PersistedDomViewsManager } from '../../utils/PersistedDomViewsManager'
import ToastOverlay from '../display/ToastOverlay.vue'
import FloatingElements from '../floating/FloatingElements.vue'
import VitePlus from '../icons/VitePlus.vue'
import ViewBuiltinClientAuthNotice from '../views-builtin/ViewBuiltinClientAuthNotice.vue'
import ViewEntry from '../views/ViewEntry.vue'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'

const props = defineProps<{
  context: DocksContext
}>()

const context = props.context
const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const persistedDoms = markRaw(new PersistedDomViewsManager(viewsContainer))

const isRpcTrusted = ref(context.rpc.isTrusted)
context.rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
  isRpcTrusted.value = isTrusted
  if (!isTrusted) {
    context.docks.switchEntry(null)
  }
})

watch(
  () => context.docks.entries,
  () => {
    context.docks.selectedId ||= context.docks.entries[0]?.id ?? null
  },
  { immediate: true },
)

const groupedEntries = computed(() => context.docks.groupedEntries)

function switchEntry(id: string | undefined) {
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
    <div class="border-r border-base flex flex-col min-h-0">
      <div class="p2 border-b border-base flex">
        <VitePlus class="w-7 h-7 ma" />
      </div>
      <div class="transition duration-200 p2 of-y-auto">
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
    <div class="min-h-0">
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
  <ToastOverlay :context />
</template>
