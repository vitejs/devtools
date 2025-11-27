<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { TerminalState } from '../state/terminals'
import { watchImmediate } from '@vueuse/core'
import { shallowRef } from 'vue'
import { useTerminals } from '../state/terminals'
import DockIcon from './DockIcon.vue'
import ViewBuiltinTerminalPanel from './ViewBuiltinTerminalPanel.vue'

const props = defineProps<{
  context: DocksContext
}>()

const terminals = useTerminals(props.context)
const selectedTerminal = shallowRef<TerminalState | null>(null)

watchImmediate(
  terminals,
  () => {
    if (selectedTerminal.value == null && terminals.size > 0) {
      selectedTerminal.value = terminals.values().next().value!
    }
  },
)
</script>

<template>
  <div class="w-full h-full grid grid-rows-[max-content_1fr]">
    <div class="border-base border-b rounded-t overflow-x-auto">
      <button
        v-for="terminal of terminals.values()"
        :key="terminal.info.id"
        class="px3 py1.5 border-r border-base hover:bg-active text-sm flex items-center gap-1"
        :class="{ 'bg-active': selectedTerminal?.info.id === terminal.info.id }"
        @click="selectedTerminal = terminal"
      >
        <DockIcon :icon="terminal.info.icon || 'ph:terminal-duotone'" />
        <span>{{ terminal.info.title }}</span>
      </button>
    </div>
    <div class="h-full w-full flex relative">
      <ViewBuiltinTerminalPanel
        v-if="selectedTerminal"
        :key="selectedTerminal.info.id"
        :context
        :terminal="selectedTerminal"
      />
      <div v-else class="flex items-center justify-center h-full w-full text-center">
        <div>Select a terminal tab to start</div>
      </div>
    </div>
  </div>
</template>
