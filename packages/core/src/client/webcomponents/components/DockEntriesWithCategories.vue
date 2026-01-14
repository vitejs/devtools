<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { GroupedDockEntries } from '../state/dock-settings'
import DockEntries from './DockEntries.vue'

defineProps<{
  context: DocksContext
  groups: GroupedDockEntries
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()
</script>

<template>
  <template v-for="[category, entries], idx of groups" :key="category">
    <slot v-if="idx > 0" name="separator" :category="category" :index="idx" :is-vertical="isVertical">
      <div class="border-base m1 h-20px w-px border-r-1.5" />
    </slot>
    <DockEntries
      :context="context"
      :entries="entries"
      :is-vertical="isVertical"
      :selected="selected"
      @select="(e) => emit('select', e)"
    />
  </template>
</template>
