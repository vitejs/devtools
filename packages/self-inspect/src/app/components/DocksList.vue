<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'

defineProps<{
  docks: DevToolsDockEntry[]
}>()
</script>

<template>
  <table w-full text-sm>
    <thead>
      <tr border="b base" text-left>
        <th px2 py1.5 font-medium op60>
          ID
        </th>
        <th px2 py1.5 font-medium op60>
          Title
        </th>
        <th px2 py1.5 font-medium op60>
          Type
        </th>
        <th px2 py1.5 font-medium op60>
          Category
        </th>
        <th px2 py1.5 font-medium op60 text-center>
          Hidden
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="dock in docks" :key="dock.id" border="b base" hover:bg-active>
        <td px2 py1.5 font-mono text-xs>
          {{ dock.id }}
        </td>
        <td px2 py1.5>
          {{ dock.title }}
        </td>
        <td px2 py1.5>
          <DisplayBadge :text="dock.type" />
        </td>
        <td px2 py1.5>
          <span v-if="dock.category" text-xs op60>{{ dock.category }}</span>
          <span v-else op20>-</span>
        </td>
        <td px2 py1.5 text-center>
          <span v-if="dock.isHidden" i-ph-eye-slash op40 />
          <span v-else op20>-</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
