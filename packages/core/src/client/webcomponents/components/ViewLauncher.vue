<script setup lang="ts">
import type { DevToolsViewLauncher, DevToolsViewLauncherStatus } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed } from 'vue'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewLauncher
}>()

function onLaunch() {
  props.context.rpc.$call('vite:core:on-dock-launch', props.entry.id)
}

const status = computed(() => props.entry.launcher.status || 'idle')
const iconsMap: Record<DevToolsViewLauncherStatus, string> = {
  error: 'i-ph-warning-duotone',
  idle: 'i-ph-rocket-launch-duotone',
  loading: 'i-svg-spinners-8-dots-rotate',
  success: 'i-ph-check-duotone',
}

const buttonText = computed(() => {
  if (status.value === 'idle')
    return props.entry.launcher.buttonStart || 'Launch'
  else if (status.value === 'loading')
    return props.entry.launcher.buttonLoading || 'Loading...'
  else if (status.value === 'error')
    return 'ERROR'
  else if (status.value === 'success')
    return 'Success'
  else
    return `UNKNOWN STATUS: ${status.value}`
})
</script>

<template>
  <div class="flex flex-col gap-4 items-center justify-center h-full relative">
    <DockIcon :icon="entry.launcher.icon || entry.icon" class="w-10 h-10" />
    <h1 class="text-2xl font-bold">
      {{ entry.launcher.title }}
    </h1>
    <p>{{ entry.launcher.description }}</p>
    <button
      class="bg-lime6 px4 py1 rounded hover:bg-lime7 transition-all duration-300 flex gap-2 items-center disabled:bg-gray6! disabled:pointer-events-none"
      :disabled="status !== 'idle'"
      @click="onLaunch"
    >
      <div :class="iconsMap[status]" />
      <div>{{ buttonText }}</div>
    </button>
  </div>
</template>
