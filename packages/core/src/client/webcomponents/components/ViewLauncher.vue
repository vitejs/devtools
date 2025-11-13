<script setup lang="ts">
import type { DevToolsViewLauncher } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewLauncher
}>()

function onLaunch() {
  props.context.rpc.$call('vite:core:on-dock-launch', props.entry.id)
}
</script>

<template>
  <div class="flex flex-col gap-4 items-center justify-center h-full relative">
    <DockIcon :icon="entry.icon" class="w-10 h-10" />
    <h1 class="text-2xl font-bold">
      {{ entry.launcher.title }}
    </h1>
    <p>{{ entry.launcher.description }}</p>
    <button class="bg-lime6 px4 py1 rounded hover:bg-lime7 transition-all duration-300" @click="onLaunch">
      Launch
    </button>
    <p>{{ entry.launcher.status }}</p>
  </div>
</template>
