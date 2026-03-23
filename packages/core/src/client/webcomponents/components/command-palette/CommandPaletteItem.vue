<script setup lang="ts">
import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'
import DockIcon from '../dock/DockIcon.vue'
import KeybindingBadge from './KeybindingBadge.vue'

defineProps<{
  entry: DevToolsCommandEntry
  parentTitle?: string
  showParentTitle: boolean
  selected: boolean
  loading: boolean
  keybindings: DevToolsCommandKeybinding[]
}>()

defineEmits<{
  select: []
  activate: []
}>()
</script>

<template>
  <button
    :id="`cmd-${entry.id}`"
    class="w-full text-left"
    @click="$emit('activate')"
    @mouseover="$emit('select')"
  >
    <div
      class="flex items-center gap-2 justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors"
      :class="selected ? 'bg-primary/10 text-primary' : 'op80 hover:op100'"
    >
      <div class="flex items-center gap-2 flex-1 of-hidden min-w-0">
        <DockIcon
          v-if="entry.icon"
          :icon="entry.icon"
          class="w-4 h-4 flex-none op70"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="truncate">
              <span v-if="parentTitle && showParentTitle" class="op50">{{ parentTitle }} &rsaquo; </span>
              {{ entry.title }}
            </span>
            <span
              v-if="entry.source === 'server'"
              class="text-[10px] px-1 py-0 rounded bg-blue/10 text-blue shrink-0 leading-4"
            >server</span>
          </div>
          <div v-if="selected && entry.description" class="truncate text-xs op40 mt-0.5">
            {{ entry.description }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 flex-none">
        <!-- Keybinding badges -->
        <KeybindingBadge
          v-for="(kb, ki) in keybindings"
          :key="ki"
          :key-string="kb.key"
        />
        <!-- Loading indicator -->
        <span v-if="loading" class="i-ph-spinner-gap-duotone w-3.5 h-3.5 animate-spin op50" />
        <!-- Drill-down indicator -->
        <span v-else-if="entry.children?.length" class="i-ph-caret-right w-3 h-3 op40" />
      </div>
    </div>
  </button>
</template>
