<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { getEntryGroup } from '../../state/dock-settings'
import { useIframePanes } from '../../utils/useIframePanes'
import CommandPalette from '../command-palette/CommandPalette.vue'
import Confirm from '../display/Confirm.vue'
import ToastOverlay from '../display/ToastOverlay.vue'
import FloatingElements from '../floating/FloatingElements.vue'
import VitePlus from '../icons/VitePlus.vue'
import ViewBuiltinClientAuthNotice from '../views-builtin/ViewBuiltinClientAuthNotice.vue'
import ViewEntry from '../views/ViewEntry.vue'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'
import DockGroupSidebar from './DockGroupSidebar.vue'

const props = defineProps<{
  context: DocksContext
}>()

const context = props.context
const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const panes = useIframePanes(viewsContainer, context.panel)

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
const activeGroup = computed(() => getEntryGroup(context.docks.entries, context.docks.selected))

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
    <div class="min-h-0 flex">
      <DockGroupSidebar
        v-if="activeGroup"
        :context
        :group="activeGroup"
        :selected-id="context.docks.selected?.id ?? null"
      />
      <div class="relative flex-1 min-w-0 min-h-0">
        <div id="vite-devtools-views-container" ref="viewsContainer" class="pointer-events-auto" />
        <ViewEntry
          v-if="context.docks.selected && panes"
          :key="context.docks.selected.id"
          :entry="context.docks.selected"
          :context
          :panes="panes"
        />
      </div>
    </div>
  </div>
  <FloatingElements />
  <CommandPalette :context />
  <ToastOverlay :context />
  <Confirm />
</template>
