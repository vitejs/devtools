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

const typeColors: Record<string, string> = {
  static: 'text-green',
  query: 'text-blue',
  action: 'text-orange',
  event: 'text-purple',
}
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ items-center gap-2">
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
    <table w-full text-sm>
      <thead>
        <tr border="b base" text-left>
          <th px2 py1.5 font-medium op60>
            Name
          </th>
          <th px2 py1.5 font-medium op60>
            Type
          </th>
          <th px2 py1.5 font-medium op60 text-center>
            Cacheable
          </th>
          <th px2 py1.5 font-medium op60 text-center>
            Schema
          </th>
          <th px2 py1.5 font-medium op60 text-center>
            Dump
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="fn in filtered" :key="fn.name" border="b base" hover:bg-active>
          <td px2 py1.5 font-mono text-xs>
            {{ fn.name }}
          </td>
          <td px2 py1.5>
            <span text-xs font-medium :class="typeColors[fn.type] || 'op60'">
              {{ fn.type }}
            </span>
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
</template>
