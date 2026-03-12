<script setup lang="ts">
import type { ClientScriptInfo } from '~~/types'
import { computed } from 'vue'

const props = defineProps<{
  scripts: ClientScriptInfo[]
}>()

const grouped = computed(() => {
  const groups = new Map<string, ClientScriptInfo[]>()
  for (const script of props.scripts) {
    const type = script.dockType
    if (!groups.has(type))
      groups.set(type, [])
    groups.get(type)!.push(script)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
})

function shortPath(path: string): string {
  const parts = path.split('/')
  if (parts.length <= 3)
    return path
  return `.../${parts.slice(-3).join('/')}`
}
</script>

<template>
  <div v-if="scripts.length === 0" flex="~ items-center justify-center" py8 op50>
    No client scripts registered.
  </div>
  <div v-else flex="~ col gap-3" p4>
    <div text-xs op60>
      {{ scripts.length }} client scripts registered
    </div>

    <div v-for="[type, typeScripts] in grouped" :key="type">
      <div flex="~ items-center gap-2" mb1 mt2>
        <DisplayBadge :text="type" />
        <DisplayNumberBadge :value="typeScripts.length" />
      </div>
      <table w-full text-sm>
        <thead>
          <tr border="b base" text-left>
            <th px2 py1 font-medium op60 text-xs>
              Dock ID
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Dock Title
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Import From
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Import Name
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="script in typeScripts" :key="script.dockId" border="b base" hover:bg-active>
            <td px2 py1.5 font-mono text-xs>
              {{ script.dockId }}
            </td>
            <td px2 py1.5>
              {{ script.dockTitle }}
            </td>
            <td px2 py1.5 font-mono text-xs max-w-60 truncate :title="script.script.importFrom">
              {{ shortPath(script.script.importFrom) }}
            </td>
            <td px2 py1.5 font-mono text-xs>
              {{ script.script.importName ?? 'default' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
