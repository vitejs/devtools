<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { DevToolsDocksUserSettings } from '../../state/dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'

const props = defineProps<{
  context: DocksContext
  settingsStore: SharedState<DevToolsDocksUserSettings>
}>()

function resetAllSettings() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset all settings to defaults? This includes appearance, docks, and shortcuts.')) {
    props.settingsStore.mutate(() => {
      return DEFAULT_STATE_USER_SETTINGS()
    })
  }
}

function resetShortcuts() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset all keyboard shortcuts to defaults?')) {
    props.settingsStore.mutate((state) => {
      state.commandShortcuts = {}
    })
  }
}

function resetDocks() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset dock visibility, order, and pinning to defaults?')) {
    props.settingsStore.mutate((state) => {
      const defaults = DEFAULT_STATE_USER_SETTINGS()
      state.docksHidden = defaults.docksHidden
      state.docksCategoriesHidden = defaults.docksCategoriesHidden
      state.docksCustomOrder = defaults.docksCustomOrder
      state.docksPinned = defaults.docksPinned
    })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Reset Shortcuts -->
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <div class="text-sm">
          Reset Keyboard Shortcuts
        </div>
        <div class="text-xs op50 mt-0.5">
          Remove all custom shortcut overrides and restore default keybindings
        </div>
      </div>
      <button
        class="px-4 py-2 rounded bg-orange/10 text-orange hover:bg-orange/20 transition-colors flex items-center gap-2 text-sm shrink-0"
        @click="resetShortcuts"
      >
        <div class="i-ph-keyboard-duotone w-4 h-4" />
        Reset Shortcuts
      </button>
    </div>

    <!-- Reset Docks -->
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <div class="text-sm">
          Reset Dock Settings
        </div>
        <div class="text-xs op50 mt-0.5">
          Restore default dock visibility, order, and pinning
        </div>
      </div>
      <button
        class="px-4 py-2 rounded bg-orange/10 text-orange hover:bg-orange/20 transition-colors flex items-center gap-2 text-sm shrink-0"
        @click="resetDocks"
      >
        <div class="i-ph-layout-duotone w-4 h-4" />
        Reset Docks
      </button>
    </div>

    <!-- Reset All -->
    <div class="border-t border-base pt-6">
      <div class="flex items-start gap-4">
        <div class="flex-1">
          <div class="text-sm">
            Reset All Settings
          </div>
          <div class="text-xs op50 mt-0.5">
            Reset everything to defaults including appearance, docks, and shortcuts
          </div>
        </div>
        <button
          class="px-4 py-2 rounded bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-2 text-sm shrink-0"
          @click="resetAllSettings"
        >
          <div class="i-ph-arrow-counter-clockwise w-4 h-4" />
          Reset All
        </button>
      </div>
    </div>
  </div>
</template>
