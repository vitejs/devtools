<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { DevToolsDocksUserSettings } from '../../state/dock-settings'
import { computed } from 'vue'
import { docksGroupByCategories } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import HashBadge from '../display/HashBadge.vue'
import DockIcon from '../dock/DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  settingsStore: SharedState<DevToolsDocksUserSettings>
}>()

const settings = sharedStateToRef(props.settingsStore)

const categories = computed(() => {
  return docksGroupByCategories(props.context.docks.entries, props.settingsStore.value(), { includeHidden: true })
})

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    '~viteplus': 'Vite+',
    'default': 'Default',
    'app': 'App',
    'framework': 'Framework',
    'web': 'Web',
    'advanced': 'Advanced',
    '~builtin': 'Built-in',
  }
  return labels[category] || category
}

function toggleDock(id: string, visible?: boolean) {
  if (id === '~settings')
    return
  const hidden = settings.value.docksHidden
  const isHidden = hidden.includes(id)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    props.settingsStore.mutate((state) => {
      state.docksHidden = state.docksHidden.filter((i: string) => i !== id)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksHidden = [...state.docksHidden, id]
    })
  }
}

function toggleCategory(category: string, visible?: boolean) {
  if (category === '~builtin')
    return
  const hidden = settings.value.docksCategoriesHidden
  const isHidden = hidden.includes(category)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    props.settingsStore.mutate((state) => {
      state.docksCategoriesHidden = state.docksCategoriesHidden.filter((i: string) => i !== category)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksCategoriesHidden = [...state.docksCategoriesHidden, category]
    })
  }
}

function togglePin(id: string) {
  const pinned = settings.value.docksPinned
  if (pinned.includes(id)) {
    props.settingsStore.mutate((state) => {
      state.docksPinned = state.docksPinned.filter((i: string) => i !== id)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksPinned = [...state.docksPinned, id]
    })
  }
}

function isInCustomOrder(id: string): boolean {
  return settings.value.docksCustomOrder[id] !== undefined
}

function moveOrder(category: string, id: string, delta: number) {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    throw new Error(`Category ${category} not found`)
  const array = [...items[1]]
  const index = array.findIndex(item => item.id === id)
  const newIndex = index + delta
  if (newIndex < 0 || newIndex >= array.length)
    throw new Error(`Invalid new index ${newIndex} for category ${category}`)

  array.splice(newIndex, 0, array.splice(index, 1)[0]!)
  items[1] = array

  props.settingsStore.mutate((state) => {
    array.forEach((item, index) => {
      state.docksCustomOrder[item.id] = index
    })
  })
}

function doesCategoryHaveCustomOrder(category: string): boolean {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    return false
  return items[1].some(item => isInCustomOrder(item.id))
}

function resetCustomOrderForCategory(category: string) {
  const items = categories.value.find(([cat]) => cat === category)
  if (!items)
    return
  props.settingsStore.mutate((state) => {
    items[1].forEach((item) => {
      delete state.docksCustomOrder[item.id]
    })
  })
}
</script>

<template>
  <p class="text-sm op50 mb-4">
    Manage visibility and order of dock entries. Hidden entries will not appear in the dock bar.
  </p>

  <div class="flex flex-col gap-4">
    <template v-for="[category, entries] of categories" :key="category">
      <div
        class="border border-base rounded-lg overflow-hidden transition-opacity"
        :class="settings.docksCategoriesHidden.includes(category) ? 'op40' : ''"
      >
        <!-- Category header -->
        <div
          class="flex items-center gap-2 px-4 py-3 bg-gray/5 cursor-pointer select-none border-b border-base"
        >
          <button
            class="w-5 h-5 flex items-center justify-center rounded transition-colors"
            :class="[
              category === '~builtin' ? 'bg-gray/20 cursor-not-allowed op50' : settings.docksCategoriesHidden.includes(category) ? 'bg-gray/20' : 'bg-lime/20 text-lime',
            ]"
            :disabled="category === '~builtin'"
            @click="toggleCategory(category)"
          >
            <div
              class="transition-transform"
              :class="settings.docksCategoriesHidden.includes(category) ? 'i-ph-eye-slash text-sm op50' : 'i-ph-check-bold text-xs'"
            />
          </button>
          <span class="font-medium capitalize">{{ getCategoryLabel(category) }}</span>
          <span class="text-xs op40">({{ entries.length }})</span>
          <span class="flex-auto" />
          <button
            v-if="doesCategoryHaveCustomOrder(category)"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
            title="Reset custom order"
            @click="resetCustomOrderForCategory(category)"
          >
            <div class="i-ph-arrows-counter-clockwise-duotone text-sm op60" />
          </button>
        </div>

        <!-- Entries -->
        <div>
          <div
            v-for="(dock, index) of entries"
            :key="dock.id"
            class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray/5 transition-colors group border-b border-base border-t-0"
            :class="settings.docksHidden.includes(dock.id) ? 'op40' : ''"
          >
            <!-- Visibility toggle -->
            <button
              class="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-base transition-colors shrink-0"
              :class="dock.id === '~settings' ? 'cursor-not-allowed op50' : settings.docksHidden.includes(dock.id) ? 'op50' : ''"
              :disabled="dock.id === '~settings'"
              :title="dock.id === '~settings' ? 'Always visible' : settings.docksHidden.includes(dock.id) ? 'Show' : 'Hide'"
              @click="toggleDock(dock.id)"
            >
              <div
                class="w-4 h-4 rounded flex items-center justify-center transition-colors"
                :class="dock.id === '~settings' ? 'bg-gray/30' : settings.docksHidden.includes(dock.id) ? 'bg-gray/30' : 'bg-lime/20 text-lime'"
              >
                <div
                  v-if="!settings.docksHidden.includes(dock.id)"
                  class="i-ph-check-bold text-xs"
                />
              </div>
            </button>

            <!-- Icon & Title -->
            <DockIcon
              :icon="dock.icon"
              :title="dock.title"
              class="w-5 h-5 shrink-0"
              :class="settings.docksHidden.includes(dock.id) ? 'saturate-0' : ''"
            />
            <span
              class="truncate"
              :class="settings.docksHidden.includes(dock.id) ? 'line-through op60' : ''"
            >
              {{ dock.title }}
            </span>
            <HashBadge
              v-if="dock.type === 'action'"
              label="Action"
              class="flex-none text-xs"
            />

            <div class="flex flex-auto" />

            <!-- Order controls -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                v-if="index > 0"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                title="Move up (higher priority)"
                @click="moveOrder(category, dock.id, -1)"
              >
                <div class="i-ph-caret-up text-sm op60" />
              </button>
              <button
                v-if="index < entries.length - 1"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                title="Move down (lower priority)"
                @click="moveOrder(category, dock.id, 1)"
              >
                <div class="i-ph-caret-down text-sm op60" />
              </button>
            </div>

            <!-- Pin toggle -->
            <button
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/20 transition-colors shrink-0"
              :class="settings.docksPinned.includes(dock.id) ? 'text-amber' : 'op40 hover:op70'"
              :title="settings.docksPinned.includes(dock.id) ? 'Unpin' : 'Pin'"
              @click="togglePin(dock.id)"
            >
              <div
                :class="settings.docksPinned.includes(dock.id) ? 'i-ph-push-pin-fill rotate--45' : 'i-ph-push-pin'"
                class="text-base"
              />
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
