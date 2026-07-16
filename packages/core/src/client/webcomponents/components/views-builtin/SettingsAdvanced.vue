<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import type { DevToolsDocksUserSettings } from '../../state/dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { useConfirm } from '../../state/confirm'
import { sharedStateToRef } from '../../state/docks'

const props = defineProps<{
  context: DocksContext
  settingsStore: SharedState<DevToolsDocksUserSettings>
}>()

const settings = sharedStateToRef(props.settingsStore)
const confirm = useConfirm()

async function resetAllSettings() {
  if (await confirm({
    title: 'Reset All Settings',
    message: 'Reset all settings to defaults? This includes appearance, docks, and shortcuts.',
  })) {
    props.settingsStore.mutate(() => {
      return DEFAULT_STATE_USER_SETTINGS()
    })
  }
}

async function resetShortcuts() {
  if (await confirm({
    title: 'Reset Keyboard Shortcuts',
    message: 'Reset all keyboard shortcuts to defaults?',
  })) {
    props.settingsStore.mutate((state) => {
      state.commandShortcuts = {}
    })
  }
}

async function resetDocks() {
  if (await confirm({
    title: 'Reset Dock Settings',
    message: 'Reset dock visibility, order, and pinning to defaults?',
  })) {
    props.settingsStore.mutate((state) => {
      const defaults = DEFAULT_STATE_USER_SETTINGS()
      state.docksHidden = defaults.docksHidden
      state.docksCategoriesHidden = defaults.docksCategoriesHidden
      state.docksCustomOrder = defaults.docksCustomOrder
      state.docksPinned = defaults.docksPinned
    })
  }
}

async function deauthorize() {
  if (await confirm({
    title: 'Revoke Authorization',
    message: 'Revoke this browser\'s access to Vite DevTools? You\'ll need to authorize again with a new code to reconnect.',
  })) {
    // Revokes this session's bearer token server-side; the server then
    // broadcasts `devframe:auth:revoked`, dropping this (and any sibling)
    // client back to untrusted.
    await props.context.rpc.call('devframe:auth:revoke')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Show Devframe Inspector toggle -->
    <label class="flex items-center gap-3 cursor-pointer group">
      <button
        class="w-10 h-6 rounded-full transition-colors relative shrink-0"
        :class="settings.showDevframeInspector ? 'bg-primary' : 'bg-gray/30'"
        @click="settingsStore.mutate((s) => { s.showDevframeInspector = !s.showDevframeInspector })"
      >
        <div
          class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
          :class="settings.showDevframeInspector ? 'translate-x-5' : 'translate-x-1'"
        />
      </button>
      <div class="flex flex-col">
        <span class="text-sm">Show Devframe Inspector</span>
        <span class="text-xs op50">Reveal the experimental Devframe Inspector dock — the DevTools for the DevTools</span>
      </div>
    </label>

    <div class="border-t border-base" />

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

    <!-- Revoke Authorization -->
    <div class="border-t border-base pt-6">
      <div class="flex items-start gap-4">
        <div class="flex-1">
          <div class="text-sm">
            Revoke Authorization
          </div>
          <div class="text-xs op50 mt-0.5">
            De-authorize this browser and revoke its access token; you'll re-authorize with a new code
          </div>
        </div>
        <button
          class="px-4 py-2 rounded bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-2 text-sm shrink-0"
          @click="deauthorize"
        >
          <div class="i-ph-sign-out-duotone w-4 h-4" />
          Revoke Access
        </button>
      </div>
    </div>
  </div>
</template>
