<script setup lang="ts">
import type { DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed } from 'vue'
import { getGroupMembersGrouped } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import { setFloatingTooltip } from '../../state/floating-tooltip'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  group: DevToolsViewGroup
  selectedId: string | null
}>()

const settings = sharedStateToRef(props.context.docks.settings)

// Members split by in-group sub-category so the sidebar can divide sections.
const memberGroups = computed(() => getGroupMembersGrouped(
  props.context.docks.entries,
  props.group.id,
  settings.value,
  { whenContext: props.context.when.context },
))

function select(id: string) {
  props.context.docks.switchEntry(id)
}

function showTooltip(event: PointerEvent, title: string) {
  setFloatingTooltip({ content: title, el: event.currentTarget as HTMLElement })
}

function hideTooltip() {
  setFloatingTooltip(null)
}
</script>

<template>
  <div class="vite-devtools-group-sidebar flex flex-col flex-none w-12 h-full border-r border-base of-y-auto of-x-hidden select-none py1.5 items-center gap-0.5">
    <!-- Group anchor -->
    <div
      class="flex items-center justify-center w-8 h-8 op60"
      @pointerenter="showTooltip($event, group.title)"
      @pointerleave="hideTooltip"
    >
      <DockIcon :icon="group.icon" class="w-5 h-5 flex-none" />
    </div>
    <div class="w-8 h-px border-t border-base my0.5" />

    <!-- Member icons, grouped by in-group sub-category -->
    <template v-for="([category, members], idx) of memberGroups" :key="category">
      <!-- Sub-category divider, mirroring the group anchor separator -->
      <div v-if="idx > 0 && members.length" class="w-8 h-px border-t border-base my0.5" />
      <button
        v-for="member of members"
        :key="member.id"
        class="relative flex items-center justify-center w-8 h-8 rounded-lg transition"
        :class="selectedId === member.id ? 'text-primary bg-active' : 'op60 hover:op100 hover:bg-active'"
        @pointerenter="showTooltip($event, member.title)"
        @pointerleave="hideTooltip"
        @pointerdown="hideTooltip"
        @click="select(member.id)"
      >
        <DockIcon :icon="member.icon" class="w-5 h-5 flex-none" />
        <div
          v-if="member.badge"
          class="absolute top-0.5 right-0.5 bg-gray-6 text-white text-0.6em px-0.5 rounded-full shadow leading-none"
        >
          {{ member.badge }}
        </div>
      </button>
    </template>
  </div>
</template>
