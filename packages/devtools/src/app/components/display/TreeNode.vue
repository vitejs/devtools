<script setup lang="ts">
import type { ModuleDest, ModuleTreeNode } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{
  node: ModuleTreeNode
  icon?: string
  link?: string | boolean
}>(), {
  icon: 'i-carbon-folder',
})

const emit = defineEmits<{
  (e: 'select', node: ModuleDest): void
}>()
const route = useRoute()
const location = window.location
function select(node: ModuleDest) {
  if (!props.link) {
    emit('select', node)
  }
}
</script>

<template>
  <details open>
    <summary
      cursor-default
      select-none
      text-sm
      truncate
      p="y1"
    >
      <div :class="icon" inline-block vertical-text-bottom />
      {{ node.name }}
    </summary>

    <DisplayTreeNode v-for="e of Object.entries(node.children)" :key="e[0]" ml4 :node="e[1]" :link="link" />
    <div
      v-for="i of node.items"
      :key="i.full"
      ml4
      ws-nowrap
    >
      <component
        :is="link ? NuxtLink : 'div'"
        :to="link ? (typeof link === 'string' ? link : { path: route.path, query: { ...route.query, module: i.full }, hash: location.hash }) : undefined"
        block
        text-sm
        p="x2 y1"
        ml1
        rounded
        @click="select(i)"
      >
        <DisplayFileIcon :filename="i.full" inline-block vertical-text-bottom />
        <span ml-1>
          {{ i.path.split('/').pop() }}
        </span>
      </component>
    </div>
  </details>
</template>
