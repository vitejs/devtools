<script setup lang="ts">
import type { ModuleTreeNode } from '~~/shared/types'
// import { useRoute } from '#app/composables/router'

withDefaults(defineProps<{
  node: ModuleTreeNode
  icon?: string
}>(), {
  icon: 'i-carbon-folder',
})

// const route = useRoute()
</script>

<template>
  <details close>
    <summary
      display="list-item"
      cursor-default
      select-none
      text-sm
      truncate
      p="y1"
    >
      <div :class="icon" inline-block vertical-text-bottom />
      {{ node.name }}
    </summary>

    <ModulesTreeNode v-for="e of Object.entries(node.children)" :key="e[0]" ml4 :node="e[1]" />
    <div
      v-for="i of node.items"
      :key="i.full"
      ml4
      ws-nowrap
    >
      <RouterLink
        block
        text-sm
        p="x2 y1"
        ml1
        rounded
        to="graph"
      >
        <DisplayFileIcon :filename="i.path" inline-block vertical-text-bottom />
        <span ml-1>
          {{ i.path.split('/').pop() }}
        </span>
      </Routerlink>
    </div>
  </details>
</template>
