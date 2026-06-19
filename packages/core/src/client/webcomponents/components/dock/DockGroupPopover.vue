<script setup lang="ts">
import type { DevToolsDockEntry, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import DockIcon from './DockIcon.vue'

defineProps<{
  context: DocksContext
  group: DevToolsViewGroup
  members: DevToolsDockEntry[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()
</script>

<template>
  <div class="flex flex-col gap-0.5 min-w-44 max-w-64" @mousemove.stop>
    <div class="flex items-center gap-1.5 px2 pt1 pb1.5 op60 text-2.75 uppercase tracking-wide font-medium">
      <DockIcon :icon="group.icon" class="w-3.5 h-3.5" />
      <span class="truncate">{{ group.title }}</span>
    </div>
    <button
      v-for="member of members"
      :key="member.id"
      class="flex items-center gap-2 w-full px2 py1.5 rounded text-sm text-left transition"
      :class="selectedId === member.id ? 'text-purple bg-active' : 'op80 hover:op100 hover:bg-active'"
      @click="emit('select', member)"
    >
      <DockIcon :icon="member.icon" class="w-4.5 h-4.5 flex-none" />
      <span class="truncate flex-1">{{ member.title }}</span>
      <div v-if="member.badge" class="bg-gray-6 text-white text-0.6em px-1 rounded-full shadow">
        {{ member.badge }}
      </div>
    </button>
    <div v-if="members.length === 0" class="px2 py1.5 op50 text-sm italic">
      No tools yet
    </div>
  </div>
</template>
