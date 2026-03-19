<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { DevToolsDockEntriesGrouped } from '../../state/dock-settings'
import DockEntries from './DockEntries.vue'

withDefaults(defineProps<{
  context: DocksContext
  groups: DevToolsDockEntriesGrouped
  selected: DevToolsDockEntry | null
  isVertical: boolean
  rotate?: boolean
}>(), {
  rotate: true,
})

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()
</script>

<template>
  <template v-for="[category, entries], idx of groups" :key="category">
    <slot v-if="idx > 0" name="separator" :category="category" :index="idx" :is-vertical="isVertical">
      <div v-if="isVertical" class="border-base m1 w-20px h-px border-b-1.5" />
      <div v-else class="border-base m1 h-20px w-px border-r-1.5" />
    </slot>
    <DockEntries
      :context="context"
      :entries="entries"
      :is-vertical="isVertical && rotate"
      :selected="selected"
      @select="(e) => emit('select', e)"
    />
  </template>
</template>
