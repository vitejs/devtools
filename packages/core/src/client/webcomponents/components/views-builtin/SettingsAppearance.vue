<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { DevToolsDocksUserSettings } from '../../state/dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed } from 'vue'
import { sharedStateToRef } from '../../state/docks'
import { isDockPopupSupported, requestDockPopupOpen, useIsDockPopupOpen } from '../../state/popup'

const props = defineProps<{
  context: DocksContext
  settingsStore: SharedState<DevToolsDocksUserSettings>
}>()

const settings = sharedStateToRef(props.settingsStore)
const panelStore = props.context.panel.store
const isEmbedded = props.context.clientType === 'embedded'
const isDockPopupOpen = useIsDockPopupOpen()

const dockModeOptions = computed(() => {
  const options = [
    { value: 'float', label: 'Float', icon: 'i-ph-cards-three-duotone' },
    { value: 'edge', label: 'Edge', icon: 'i-ph-square-half-bottom-duotone' },
  ]
  if (isDockPopupSupported()) {
    options.push({ value: 'popup', label: 'Popup', icon: 'i-ph-arrow-square-out-duotone' })
  }
  return options
})

const currentDockMode = computed(() => panelStore.mode)

function setDockMode(mode: string) {
  if (mode === 'popup') {
    requestDockPopupOpen(props.context)
  }
  else {
    panelStore.mode = mode as 'float' | 'edge'
  }
}

function resetSettings() {
  // eslint-disable-next-line no-alert
  if (confirm('Reset all dock settings to defaults?')) {
    props.settingsStore.mutate(() => {
      return DEFAULT_STATE_USER_SETTINGS()
    })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Dock mode -->
    <div v-if="isEmbedded && !isDockPopupOpen" class="flex flex-col gap-2">
      <div class="flex flex-col">
        <span class="text-sm">Dock mode</span>
        <span class="text-xs op50">How the DevTools panel is displayed</span>
      </div>
      <div class="flex items-center gap-1 bg-gray/10 rounded-lg p1 w-fit">
        <button
          v-for="option of dockModeOptions"
          :key="option.value"
          class="flex items-center gap-1.5 px3 py1.5 rounded-md text-sm transition-all"
          :class="currentDockMode === option.value
            ? 'bg-base shadow text-primary font-medium'
            : 'op60 hover:op100 hover:bg-gray/10'"
          @click="setDockMode(option.value)"
        >
          <div :class="option.icon" class="w-4 h-4" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Show iframe address bar toggle -->
    <label class="flex items-center gap-3 cursor-pointer group">
      <button
        class="w-10 h-6 rounded-full transition-colors relative shrink-0"
        :class="settings.showIframeAddressBar ? 'bg-lime' : 'bg-gray/30'"
        @click="settingsStore.mutate((s) => { s.showIframeAddressBar = !s.showIframeAddressBar })"
      >
        <div
          class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
          :class="settings.showIframeAddressBar ? 'translate-x-5' : 'translate-x-1'"
        />
      </button>
      <div class="flex flex-col">
        <span class="text-sm">Show iframe address bar</span>
        <span class="text-xs op50">Display navigation controls and URL bar for iframe views</span>
      </div>
    </label>

    <!-- Close on outside click toggle -->
    <label class="flex items-center gap-3 cursor-pointer group">
      <button
        class="w-10 h-6 rounded-full transition-colors relative shrink-0"
        :class="settings.closeOnOutsideClick ? 'bg-lime' : 'bg-gray/30'"
        @click="settingsStore.mutate((s) => { s.closeOnOutsideClick = !s.closeOnOutsideClick })"
      >
        <div
          class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
          :class="settings.closeOnOutsideClick ? 'translate-x-5' : 'translate-x-1'"
        />
      </button>
      <div class="flex flex-col">
        <span class="text-sm">Close panel on outside click</span>
        <span class="text-xs op50">Close the DevTools panel when clicking outside of it (embedded mode only)</span>
      </div>
    </label>
  </div>

  <!-- Reset -->
  <div class="border-t border-base mt-8 pt-6">
    <button
      class="px-4 py-2 rounded bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-2 text-sm"
      @click="resetSettings"
    >
      <div class="i-ph-arrow-counter-clockwise" />
      Reset All Settings
    </button>
  </div>
</template>
