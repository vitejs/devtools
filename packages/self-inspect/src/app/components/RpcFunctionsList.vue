<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  functions: {
    name: string
    type: string
    cacheable: boolean
    hasArgs: boolean
    hasReturns: boolean
    hasDump: boolean
    hasSetup: boolean
    hasHandler: boolean
  }[]
}>()

const search = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q)
    return props.functions
  return props.functions.filter(fn => fn.name.toLowerCase().includes(q))
})

const typeStats = computed(() => {
  const stats: Record<string, number> = {}
  for (const fn of props.functions)
    stats[fn.type] = (stats[fn.type] || 0) + 1
  return stats
})

function getNamespace(name: string) {
  const parts = name.split(':')
  if (parts.length <= 1)
    return '(other)'
  return parts.slice(0, -1).join(':')
}

const grouped = computed(() => {
  const groups = new Map<string, typeof filtered.value>()
  for (const fn of filtered.value) {
    const ns = getNamespace(fn.name)
    if (!groups.has(ns))
      groups.set(ns, [])
    groups.get(ns)!.push(fn)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div flex="~ col gap-3" p4>
    <div flex="~ items-center gap-3 flex-wrap">
      <div flex="~ items-center gap-2" flex-1 min-w-50>
        <div i-ph-magnifying-glass op40 />
        <input
          v-model="search"
          placeholder="Filter functions..."
          border="~ base rounded"
          bg-transparent px2 py1 text-sm flex-1
          outline-none
          focus:border-primary
        >
      </div>
      <div flex="~ items-center gap-2" text-xs op60>
        <span>{{ props.functions.length }} total</span>
        <span op30>|</span>
        <span v-for="(count, type) in typeStats" :key="type">
          <DisplayBadge :text="String(type)" />
          {{ count }}
        </span>
      </div>
    </div>

    <div v-for="[ns, fns] in grouped" :key="ns">
      <div flex="~ items-center gap-2" mb1 mt2>
        <span font-mono text-xs op50>{{ ns }}</span>
        <DisplayNumberBadge :value="fns.length" />
      </div>
      <table w-full text-sm>
        <thead>
          <tr border="b base" text-left>
            <th px2 py1 font-medium op60 text-xs>
              Name
            </th>
            <th px2 py1 font-medium op60 text-xs>
              Type
            </th>
            <th px2 py1 font-medium op60 text-xs text-center>
              Cacheable
            </th>
            <th px2 py1 font-medium op60 text-xs text-center>
              Schema
            </th>
            <th px2 py1 font-medium op60 text-xs text-center>
              Dump
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fn in fns" :key="fn.name" border="b base" hover:bg-active>
            <td px2 py1.5 font-mono text-xs>
              {{ fn.name }}
            </td>
            <td px2 py1.5>
              <DisplayBadge :text="fn.type" />
            </td>
            <td px2 py1.5 text-center>
              <span v-if="fn.cacheable" i-ph-check text-green />
              <span v-else op20>-</span>
            </td>
            <td px2 py1.5 text-center>
              <span v-if="fn.hasArgs || fn.hasReturns" text-xs op60>
                {{ fn.hasArgs ? 'args' : '' }}{{ fn.hasArgs && fn.hasReturns ? ' + ' : '' }}{{ fn.hasReturns ? 'returns' : '' }}
              </span>
              <span v-else op20>-</span>
            </td>
            <td px2 py1.5 text-center>
              <span v-if="fn.hasDump" i-ph-check text-green />
              <span v-else op20>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
