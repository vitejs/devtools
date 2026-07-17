<script setup lang="ts">
import type { DevToolsViewLauncher, DevToolsViewLauncherStatus } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { computed } from 'vue'
import Button from '../display/Button.vue'
import DockIcon from '../dock/DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewLauncher
}>()

function onLaunch() {
  props.context.rpc.call('devtoolskit:internal:docks:on-launch', props.entry.id)
}

const status = computed(() => props.entry.launcher.status || 'idle')
const digest = computed(() => props.entry.launcher.digest)
const terminalSessionId = computed(() => props.entry.launcher.terminalSessionId)

// Ask the host shell to switch to the Terminals dock focused on this
// launcher's session (devframe 0.7.3 `hub:docks:activate`). Our shell converges
// on the mirrored `devframe:docks:active` slot to perform the switch.
function viewInTerminal() {
  if (!terminalSessionId.value)
    return
  props.context.rpc.call('hub:docks:activate', {
    dockId: DEVTOOLS_TERMINALS_DOCK_ID,
    params: { sessionId: terminalSessionId.value },
  })
}

const iconsMap: Record<DevToolsViewLauncherStatus, string> = {
  error: 'i-ph-arrow-clockwise-duotone',
  idle: 'i-ph-rocket-launch-duotone',
  loading: 'i-svg-spinners-8-dots-rotate',
  success: 'i-ph-check-duotone',
}

const error = computed(() => props.entry.launcher.error)

const buttonText = computed(() => {
  if (status.value === 'idle')
    return props.entry.launcher.buttonStart || 'Launch'
  else if (status.value === 'loading')
    return props.entry.launcher.buttonLoading || 'Loading...'
  else if (status.value === 'error')
    return 'Retry'
  else if (status.value === 'success')
    return 'Success'
  else
    return `UNKNOWN STATUS: ${status.value}`
})

// Idle and error are actionable (error = Retry); loading and success are not.
const canLaunch = computed(() => status.value === 'idle' || status.value === 'error')
</script>

<template>
  <div class="flex flex-col gap-4 items-center justify-center h-full relative">
    <DockIcon :icon="entry.launcher.icon || entry.icon" class="w-10 h-10" />
    <h1 class="text-2xl font-bold">
      {{ entry.launcher.title }}
    </h1>
    <p>{{ entry.launcher.description }}</p>
    <!-- Failure reason, shown above the Retry button. -->
    <p v-if="status === 'error' && error" class="max-w-full text-sm text-red-600 dark:text-red-400 text-center text-balance">
      {{ error }}
    </p>
    <Button
      :variant="status === 'error' ? 'danger' : 'primary'"
      :loading="status === 'loading'"
      :disabled="!canLaunch"
      @click="onLaunch"
    >
      <template #icon>
        <div class="w-4.5 h-4.5" :class="iconsMap[status]" />
      </template>
      {{ buttonText }}
    </Button>

    <!-- Live line of progress from the bound terminal session. Click to jump
         to that session in the Terminals dock. -->
    <button
      v-if="digest"
      type="button"
      :disabled="!terminalSessionId"
      class="max-w-full inline-flex items-center gap-2 px3 py1.5 rounded-md bg-secondary font-mono text-xs color-base transition-colors outline-none enabled:hover:bg-[#8883] enabled:cursor-pointer disabled:cursor-default focus-visible:ring-3 focus-visible:ring-primary-500/30"
      :title="terminalSessionId ? 'View in Terminal' : undefined"
      @click="viewInTerminal"
    >
      <div class="i-ph-terminal-window-duotone flex-none op70" />
      <span class="truncate">{{ digest }}</span>
    </button>

    <Button
      v-if="terminalSessionId"
      variant="ghost"
      size="sm"
      @click="viewInTerminal"
    >
      <template #icon>
        <div class="w-3.5 h-3.5 i-ph-arrow-square-out-duotone" />
      </template>
      View in Terminal
    </Button>
  </div>
</template>
