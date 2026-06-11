<script setup lang="ts">
import type { DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed } from 'vue'
import { getGroupMembers } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  group: DevToolsViewGroup
  selectedId: string | null
}>()

const settings = sharedStateToRef(props.context.docks.settings)

const members = computed(() => getGroupMembers(
  props.context.docks.entries,
  props.group.id,
  settings.value,
  { whenContext: props.context.when.context },
))

function select(id: string) {
  props.context.docks.switchEntry(id)
}
</script>

<template>
  <div class="vite-devtools-group-sidebar flex flex-col flex-none w-44 h-full border-r border-base of-y-auto select-none">
    <div class="flex items-center gap-1.5 px3 py2.5 border-b border-base">
      <DockIcon :icon="group.icon" class="w-4.5 h-4.5 flex-none" />
      <span class="truncate font-medium text-sm">{{ group.title }}</span>
    </div>
    <div class="flex flex-col gap-0.5 p1.5">
      <button
        v-for="member of members"
        :key="member.id"
        class="flex items-center gap-2 w-full px2 py1.5 rounded text-sm text-left transition"
        :class="selectedId === member.id ? 'text-purple bg-active' : 'op75 hover:op100 hover:bg-active'"
        @click="select(member.id)"
      >
        <DockIcon :icon="member.icon" class="w-4.5 h-4.5 flex-none" />
        <span class="truncate flex-1">{{ member.title }}</span>
        <div v-if="member.badge" class="bg-gray-6 text-white text-0.6em px-1 rounded-full shadow">
          {{ member.badge }}
        </div>
      </button>
    </div>
  </div>
</template>
