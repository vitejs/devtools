<script setup lang="ts">
import type { ClientScriptInfo } from '~~/node/rpc/functions/get-client-scripts'

defineProps<{
  scripts: ClientScriptInfo[]
}>()
</script>

<template>
  <div v-if="scripts.length === 0" flex="~ items-center justify-center" py8 op50>
    No client scripts registered.
  </div>
  <table v-else w-full text-sm>
    <thead>
      <tr border="b base" text-left>
        <th px2 py1.5 font-medium op60>
          Dock ID
        </th>
        <th px2 py1.5 font-medium op60>
          Dock Title
        </th>
        <th px2 py1.5 font-medium op60>
          Dock Type
        </th>
        <th px2 py1.5 font-medium op60>
          Import From
        </th>
        <th px2 py1.5 font-medium op60>
          Import Name
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="script in scripts" :key="script.dockId" border="b base" hover:bg-active>
        <td px2 py1.5 font-mono text-xs>
          {{ script.dockId }}
        </td>
        <td px2 py1.5>
          {{ script.dockTitle }}
        </td>
        <td px2 py1.5>
          <DisplayBadge :text="script.dockType" />
        </td>
        <td px2 py1.5 font-mono text-xs max-w-60 truncate>
          {{ script.script.importFrom }}
        </td>
        <td px2 py1.5 font-mono text-xs>
          {{ script.script.importName ?? 'default' }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
