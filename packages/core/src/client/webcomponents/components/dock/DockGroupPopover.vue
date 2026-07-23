<script setup lang="ts">
import type { DevToolsDockEntriesGrouped, DevToolsDockEntry, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed } from 'vue'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  group: DevToolsViewGroup
  /** Members split by in-group sub-category, in display order. */
  members: DevToolsDockEntriesGrouped
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const isEmpty = computed(() => props.members.every(([, items]) => items.length === 0))
</script>

<template>
  <div class="flex flex-col gap-0.5 min-w-44 max-w-64" @mousemove.stop>
    <div class="flex items-center gap-1.5 px4 mx--2 pt2 pb2.5 font-bold text-2.75 uppercase tracking-wide border-b border-base">
      <DockIcon :icon="group.icon" class="w-4.5 h-4.5" />
      <span class="truncate">{{ group.title }}</span>
    </div>
    <template v-for="([category, items], idx) of members" :key="category">
      <!-- Sub-category divider, mirroring the outer bar's category separators -->
      <div v-if="idx > 0 && items.length" class="border-t border-base mx--2 my1" />
      <button
        v-for="member of items"
        :key="member.id"
        class="flex items-center gap-2 w-full px2 py1.5 rounded text-sm text-left transition"
        :class="selectedId === member.id ? 'text-primary bg-active' : 'op80 hover:op100 hover:bg-active'"
        @click="emit('select', member)"
      >
        <DockIcon :icon="member.icon" class="w-4.5 h-4.5 flex-none" />
        <span class="truncate flex-1">{{ member.title }}</span>
        <div v-if="member.badge" class="bg-gray-6 text-white text-0.6em px-1 rounded-full shadow">
          {{ member.badge }}
        </div>
      </button>
    </template>
    <div v-if="isEmpty" class="px2 py1.5 op50 text-sm italic">
      No tools yet
    </div>
  </div>
</template>
