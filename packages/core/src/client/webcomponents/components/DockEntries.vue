<script setup lang="ts">
import type { DevToolsDockEntry, DevToolsDockEntryBase, DevToolsDockEntryCategory } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, reactive, toRefs } from 'vue'
import DockContextMenu from './DockContextMenu.vue'
import DockEntry from './DockEntry.vue'
import DockOverflowMenu from './DockOverflowMenu.vue'

const props = withDefaults(defineProps<{
  entries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
  isVertical: boolean
  context: DocksContext
  /**
   * Maximum number of visible dock entries before showing overflow menu
   * Set to 0 or negative to disable overflow (show all)
   */
  maxVisible?: number
}>(), {
  maxVisible: 8,
})

const emit = defineEmits<{
  (e: 'select', entry: DevToolsDockEntry): void
}>()

const { selected, isVertical, entries, maxVisible, context } = toRefs(props)

// Category order for sorting groups
const categoryOrder: DevToolsDockEntryCategory[] = ['app', 'framework', 'web', 'default', 'advanced']

// Filter visible entries
const visibleEntries = computed(() => entries.value.filter(e => !e.isHidden))

// Split entries into visible and overflow
const splitEntries = computed(() => {
  const all = visibleEntries.value
  const max = maxVisible.value

  // If maxVisible is 0 or negative, show all entries
  if (max <= 0) {
    return { mainEntries: all, overflowEntries: [] as DevToolsDockEntry[] }
  }

  // Reserve 1 spot for overflow button if needed
  const hasOverflow = all.length > max
  const visibleCount = hasOverflow ? max - 1 : all.length

  return {
    mainEntries: all.slice(0, visibleCount),
    overflowEntries: all.slice(visibleCount),
  }
})

const mainEntries = computed(() => splitEntries.value.mainEntries)
const overflowEntries = computed(() => splitEntries.value.overflowEntries)

// Group main entries by category
const groupedEntries = computed(() => {
  const groups = new Map<DevToolsDockEntryCategory, DevToolsDockEntry[]>()

  for (const entry of mainEntries.value) {
    const category = entry.category ?? 'default'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(entry)
  }

  // Sort groups by category order and filter out empty groups
  return categoryOrder
    .filter(cat => groups.has(cat))
    .map(cat => ({
      category: cat,
      entries: groups.get(cat)!,
    }))
})

function toggleDockEntry(dock: DevToolsDockEntry) {
  if (selected.value?.id === dock.id)
    emit('select', undefined!)
  else
    emit('select', dock)
}

// Context menu state
const contextMenu = reactive<{
  entry: DevToolsDockEntry | null
  position: { x: number, y: number }
}>({
  entry: null,
  position: { x: 0, y: 0 },
})

const contextMenuEntryState = computed(() => {
  if (!contextMenu.entry)
    return null
  return context.value.docks.getStateById(contextMenu.entry.id) ?? null
})

function onContextMenu(event: { entry: DevToolsDockEntryBase, position: { x: number, y: number } }) {
  // Find the full entry from entries
  const fullEntry = entries.value.find(e => e.id === event.entry.id)
  if (fullEntry) {
    contextMenu.entry = fullEntry
    contextMenu.position = event.position
  }
}

function closeContextMenu() {
  contextMenu.entry = null
}

function hideEntry(entryId: string) {
  // TODO: Implement persistent hidden docks storage
  // For now, we'll just log it - actual hiding would need RPC call to server
  console.warn(`[Vite DevTools] Hide dock "${entryId}" - not yet implemented (needs server-side storage)`)
}

function toggleAddressBar(entryId: string) {
  const entryState = context.value.docks.getStateById(entryId)
  if (entryState) {
    entryState.settings.showAddressBar = !entryState.settings.showAddressBar
  }
}
</script>

<template>
  <div class="flex items-center gap-1">
    <template v-for="(group, groupIndex) of groupedEntries" :key="group.category">
      <!-- Category separator (not for first group) -->
      <div
        v-if="groupIndex > 0"
        class="vite-devtools-dock-separator mx-0.5 bg-current op20 rounded-full"
        :class="isVertical ? 'w-3 h-0.5' : 'w-0.5 h-3'"
      />
      <!-- Entries in this category -->
      <template v-for="dock of group.entries" :key="dock.id">
        <DockEntry
          :dock
          :is-selected="selected?.id === dock.id"
          :is-dimmed="selected ? (selected.id !== dock.id) : false"
          :is-vertical="isVertical"
          @click="toggleDockEntry(dock)"
          @contextmenu="onContextMenu"
        />
      </template>
    </template>

    <!-- Overflow menu -->
    <template v-if="overflowEntries.length > 0">
      <div
        class="vite-devtools-dock-separator mx-0.5 bg-current op20 rounded-full"
        :class="isVertical ? 'w-3 h-0.5' : 'w-0.5 h-3'"
      />
      <DockOverflowMenu
        :entries="overflowEntries"
        :selected="selected"
        :is-vertical="isVertical"
        @select="toggleDockEntry"
      />
    </template>

    <!-- Context Menu -->
    <DockContextMenu
      :entry="contextMenu.entry"
      :entry-state="contextMenuEntryState"
      :position="contextMenu.position"
      @close="closeContextMenu"
      @hide="hideEntry"
      @toggle-address-bar="toggleAddressBar"
    />
  </div>
</template>
