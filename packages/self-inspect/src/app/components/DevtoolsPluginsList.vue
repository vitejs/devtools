<script setup lang="ts">
import type { DevtoolsPluginInfo } from '../../types'
import { computed, ref } from 'vue'

const props = defineProps<{
  plugins: DevtoolsPluginInfo[]
}>()

const showAll = ref(false)

const filtered = computed(() => {
  if (showAll.value)
    return props.plugins
  return props.plugins.filter(p => p.hasDevtools)
})
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ items-center gap-2">
      <label flex="~ items-center gap-1.5" text-sm op60 cursor-pointer select-none>
        <input v-model="showAll" type="checkbox">
        Show all Vite plugins ({{ plugins.length }} total)
      </label>
    </div>
    <table w-full text-sm>
      <thead>
        <tr border="b base" text-left>
          <th px2 py1.5 font-medium op60>
            Plugin Name
          </th>
          <th px2 py1.5 font-medium op60 text-center>
            DevTools
          </th>
          <th px2 py1.5 font-medium op60 text-center>
            Setup
          </th>
          <th px2 py1.5 font-medium op60>
            Capabilities
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="plugin in filtered" :key="plugin.name" border="b base" hover:bg-active>
          <td px2 py1.5 font-mono text-xs>
            {{ plugin.name }}
          </td>
          <td px2 py1.5 text-center>
            <span v-if="plugin.hasDevtools" i-ph-check text-green />
            <span v-else op20>-</span>
          </td>
          <td px2 py1.5 text-center>
            <span v-if="plugin.hasSetup" i-ph-check text-green />
            <span v-else op20>-</span>
          </td>
          <td px2 py1.5 text-xs>
            <span v-if="plugin.capabilities" font-mono op60>
              {{ JSON.stringify(plugin.capabilities) }}
            </span>
            <span v-else op20>-</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
