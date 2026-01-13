<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { computed } from 'vue'
import { DEFAULT_CATEGORIES_ORDER } from '../constants'
import DockEntries from './DockEntries.vue'

const props = defineProps<{
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const groups = computed(() => {
  const map = new Map<string, DevToolsDockEntry[]>()
  for (const entry of props.entries) {
    if (entry.isHidden)
      continue
    const category = entry.category ?? 'default'
    if (!map.has(category))
      map.set(category, [])
    map.get(category)!.push(entry)
  }

  const entries = Array
    .from(map.entries())
    .sort(([a], [b]) => {
      const ia = DEFAULT_CATEGORIES_ORDER[a] || 0
      const ib = DEFAULT_CATEGORIES_ORDER[b] || 0
      return ib === ia ? b.localeCompare(a) : ia - ib
    })

  entries.forEach(([_, entries]) => {
    entries.sort((a, b) => {
      const ia = a.defaultOrder ?? 0
      const ib = b.defaultOrder ?? 0
      return ib === ia ? b.title.localeCompare(a.title) : ia - ib
    })
  })
  return entries
})
</script>

<template>
  <template v-for="[category, entries], idx of groups" :key="category">
    <slot v-if="idx > 0" name="separator" :category="category" :index="idx" :is-vertical="isVertical">
      <div class="border-base m1 h-20px w-px border-r-1.5" />
    </slot>
    <DockEntries
      :entries="entries"
      :is-vertical="isVertical"
      :selected="selected"
      @select="(e) => emit('select', e)"
    />
  </template>
</template>
