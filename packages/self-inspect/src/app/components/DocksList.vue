<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { computed } from 'vue'

const props = defineProps<{
  docks: DevToolsDockEntry[]
}>()

const grouped = computed(() => {
  const groups = new Map<string, DevToolsDockEntry[]>()
  for (const dock of props.docks) {
    const cat = dock.category || 'default'
    if (!groups.has(cat))
      groups.set(cat, [])
    groups.get(cat)!.push(dock)
  }
  return Array.from(groups.entries())
})

function getUrl(dock: DevToolsDockEntry): string | undefined {
  if (dock.type === 'iframe')
    return dock.url
  return undefined
}

function hasClientScript(dock: DevToolsDockEntry): boolean {
  return dock.type === 'iframe' && !!dock.clientScript
}
</script>

<template>
  <div flex="~ col gap-3" p4>
    <div text-xs op60>
      {{ props.docks.length }} docks registered
    </div>

    <div v-for="[category, categoryDocks] in grouped" :key="category">
      <div flex="~ items-center gap-2" mb1 mt2>
        <span text-xs font-medium op50>{{ category }}</span>
        <DisplayNumberBadge :value="categoryDocks.length" />
      </div>
      <table w-full text-sm>
        <thead>
          <tr border="b base" text-left>
            <th px2 py1 font-medium op60 text-xs>
              ID
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Title
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Type
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="dock in categoryDocks" :key="dock.id"
            border="b base" hover:bg-active
            :class="dock.isHidden ? 'op40' : ''"
          >
            <td px2 py1.5 font-mono text-xs flex="~ items-center gap-1">
              <span v-if="dock.isHidden" i-ph-eye-slash text-xs op60 />
              {{ dock.id }}
            </td>
            <td px2 py1.5>
              {{ dock.title }}
            </td>
            <td px2 py1.5>
              <DisplayBadge :text="dock.type" />
            </td>
            <td px2 py1.5 text-xs>
              <span v-if="getUrl(dock)" font-mono op60>{{ getUrl(dock) }}</span>
              <span v-if="hasClientScript(dock)" ml1>
                <DisplayBadge text="client-script" />
              </span>
              <span v-if="!getUrl(dock) && !hasClientScript(dock)" op20>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
