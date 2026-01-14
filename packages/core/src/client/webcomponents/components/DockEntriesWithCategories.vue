<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, toRefs } from 'vue'
import { DEFAULT_CATEGORIES_ORDER } from '../constants'
import DockEntries from './DockEntries.vue'

const props = defineProps<{
  context: DocksContext
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  capacity?: number
  isVertical: boolean
}>()

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { capacity } = toRefs(props)

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

  let visible = entries
  const overflow: typeof entries = []

  if (capacity.value != null) {
    visible = []
    let left = capacity.value
    for (const [category, items] of entries) {
      if (left <= 0) {
        overflow.push([category, items])
      }
      else if (items.length > left) {
        visible.push([category, items.slice(0, left)])
        overflow.push([category, items.slice(left)])
        left = 0
      }
      else {
        left -= items.length
        visible.push([category, items])
      }
    }
  }

  return {
    entries,
    visible,
    overflow,
  }
})
</script>

<template>
  <template v-for="[category, entries], idx of groups.visible" :key="category">
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
  <slot v-if="groups.overflow.length > 0" name="overflow" :entries="groups.overflow" />
</template>
