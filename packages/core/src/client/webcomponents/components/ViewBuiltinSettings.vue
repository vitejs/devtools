<script setup lang="ts">
import type { DevToolsDocksUserSettings, DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { defaultDocksSettings, groupDockEntries } from '../state/dock-settings'
import { sharedStateToRef } from '../state/docks'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewBuiltin
}>()

const settings = shallowRef<DevToolsDocksUserSettings>(defaultDocksSettings())
const isLoading = shallowRef(true)
let sharedState: SharedState<DevToolsDocksUserSettings> | undefined

onMounted(async () => {
  sharedState = await props.context.docks.getSettingsStore()
  const settingsRef = sharedStateToRef(sharedState)
  settings.value = settingsRef.value
  watch(settingsRef, v => settings.value = v)

  isLoading.value = false

  watch(
    settings,
    (newSettings) => {
      sharedState?.mutate(() => newSettings)
    },
    { deep: false },
  )
})

function updateSettings(patch: Partial<DevToolsDocksUserSettings>) {
  settings.value = { ...settings.value, ...patch }
}

const categories = computed(() => {
  return groupDockEntries(props.context.docks.entries, settings.value, { includeHidden: true })
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
  const hidden = settings.value.hiddenDocks
  const isHidden = hidden.includes(id)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    updateSettings({ hiddenDocks: hidden.filter((i: string) => i !== id) })
  }
  else {
    updateSettings({ hiddenDocks: [...hidden, id] })
  }
}

function toggleCategory(category: string, visible?: boolean) {
  const hidden = settings.value.hiddenCategories
  const isHidden = hidden.includes(category)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    updateSettings({ hiddenCategories: hidden.filter((i: string) => i !== category) })
  }
  else {
    updateSettings({ hiddenCategories: [...hidden, category] })
  }
}

function togglePin(id: string) {
  const pinned = settings.value.pinnedDocks
  if (pinned.includes(id)) {
    updateSettings({ pinnedDocks: pinned.filter((i: string) => i !== id) })
  }
  else {
    updateSettings({ pinnedDocks: [...pinned, id] })
  }
}

function moveOrder(id: string, delta: number) {
  const customOrder = { ...settings.value.customOrder }
  const current = customOrder[id] ?? 0
  customOrder[id] = current + delta
  updateSettings({ customOrder })
}

function resetSettings() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset all dock settings to defaults?')) {
    settings.value = defaultDocksSettings()
  }
}
</script>

<template>
  <div class="h-full w-full overflow-auto p10">
    <div class="max-w-200 mx-auto">
      <h1 class="text-xl font-semibold mb-6 flex items-center gap-2 op85">
        <div class="i-ph-gear-duotone text-2xl" />
        DevTools Settings
      </h1>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <div class="i-svg-spinners-ring-resize text-2xl op50" />
      </div>

      <template v-else>
        <section class="mb-8">
          <h2 class="text-lg font-medium mb-4 op75">
            Dock Entries
          </h2>
          <p class="text-sm op50 mb-4">
            Manage visibility and order of dock entries. Hidden entries will not appear in the dock bar.
          </p>

          <div class="flex flex-col gap-4">
            <template v-for="[category, entries] of categories" :key="category">
              <div
                class="border border-base rounded-lg overflow-hidden transition-opacity"
                :class="settings.hiddenCategories.includes(category) ? 'op40' : ''"
              >
                <!-- Category header -->
                <div
                  class="flex items-center gap-2 px-4 py-3 bg-gray/5 cursor-pointer select-none"
                  @click="toggleCategory(category)"
                >
                  <div
                    class="w-5 h-5 flex items-center justify-center rounded transition-colors"
                    :class="settings.hiddenCategories.includes(category) ? 'bg-gray/20' : 'bg-lime/20 text-lime'"
                  >
                    <div
                      class="transition-transform"
                      :class="settings.hiddenCategories.includes(category) ? 'i-ph-eye-slash text-sm op50' : 'i-ph-check-bold text-xs'"
                    />
                  </div>
                  <span class="font-medium capitalize">{{ getCategoryLabel(category) }}</span>
                  <span class="text-xs op40">({{ entries.length }})</span>
                </div>

                <!-- Entries -->
                <div class="divide-y border-base">
                  <div
                    v-for="dock of entries"
                    :key="dock.id"
                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray/5 transition-colors group"
                    :class="settings.hiddenDocks.includes(dock.id) ? 'op40' : ''"
                  >
                    <!-- Visibility toggle -->
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-base transition-colors shrink-0"
                      :class="settings.hiddenDocks.includes(dock.id) ? 'op50' : ''"
                      :title="settings.hiddenDocks.includes(dock.id) ? 'Show' : 'Hide'"
                      @click="toggleDock(dock.id)"
                    >
                      <div
                        class="w-4 h-4 rounded flex items-center justify-center transition-colors"
                        :class="settings.hiddenDocks.includes(dock.id) ? 'bg-gray/30' : 'bg-lime/20 text-lime'"
                      >
                        <div
                          v-if="!settings.hiddenDocks.includes(dock.id)"
                          class="i-ph-check-bold text-xs"
                        />
                      </div>
                    </button>

                    <!-- Icon & Title -->
                    <DockIcon
                      :icon="dock.icon"
                      :title="dock.title"
                      class="w-5 h-5 shrink-0"
                      :class="settings.hiddenDocks.includes(dock.id) ? 'saturate-0' : ''"
                    />
                    <span
                      class="flex-1 truncate"
                      :class="settings.hiddenDocks.includes(dock.id) ? 'line-through op60' : ''"
                    >
                      {{ dock.title }}
                    </span>

                    <!-- Order controls -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move up (higher priority)"
                        @click="moveOrder(dock.id, 1)"
                      >
                        <div class="i-ph-caret-up text-sm op60" />
                      </button>
                      <button
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move down (lower priority)"
                        @click="moveOrder(dock.id, -1)"
                      >
                        <div class="i-ph-caret-down text-sm op60" />
                      </button>
                    </div>

                    <!-- Pin toggle -->
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/20 transition-colors shrink-0"
                      :class="settings.pinnedDocks.includes(dock.id) ? 'text-amber' : 'op40 hover:op70'"
                      :title="settings.pinnedDocks.includes(dock.id) ? 'Unpin' : 'Pin'"
                      @click="togglePin(dock.id)"
                    >
                      <div
                        :class="settings.pinnedDocks.includes(dock.id) ? 'i-ph-push-pin-fill rotate--45' : 'i-ph-push-pin'"
                        class="text-base"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </section>

        <section class="border-t border-base pt-6">
          <h2 class="text-lg font-medium mb-4 op75">
            Reset
          </h2>
          <button
            class="px-4 py-2 rounded bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-2"
            @click="resetSettings"
          >
            <div class="i-ph-arrow-counter-clockwise" />
            Reset Dock Settings
          </button>
        </section>
      </template>
    </div>
  </div>
</template>
