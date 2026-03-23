<script setup lang="ts">
import type { DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { ref } from 'vue'
import SettingsAppearance from './SettingsAppearance.vue'
import SettingsDocks from './SettingsDocks.vue'
import SettingsShortcuts from './SettingsShortcuts.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewBuiltin
}>()

const tabs = [
  { id: 'appearance', label: 'Appearance', icon: 'i-ph-paint-brush-duotone' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'i-ph-keyboard-duotone' },
  { id: 'docks', label: 'Docks', icon: 'i-ph-layout-duotone' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = ref<TabId>('appearance')

const settingsStore = props.context.docks.settings
</script>

<template>
  <div class="h-full w-full overflow-hidden flex flex-col">
    <!-- Tab bar -->
    <div class="flex items-center border-b border-base px-6 shrink-0">
      <button
        v-for="tab of tabs"
        :key="tab.id"
        class="flex items-center gap-1.5 px-4 py-3 text-sm transition-colors relative"
        :class="activeTab === tab.id
          ? 'op100 text-primary'
          : 'op50 hover:op80'"
        @click="activeTab = tab.id"
      >
        <div :class="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
        <div
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto p8">
      <div class="max-w-200 mx-auto">
        <SettingsAppearance
          v-if="activeTab === 'appearance'"
          :context="context"
          :settings-store="settingsStore"
        />
        <SettingsShortcuts
          v-if="activeTab === 'shortcuts'"
          :context="context"
        />
        <SettingsDocks
          v-if="activeTab === 'docks'"
          :context="context"
          :settings-store="settingsStore"
        />
      </div>
    </div>
  </div>
</template>
