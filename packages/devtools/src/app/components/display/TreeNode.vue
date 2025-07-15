<script setup lang="ts">
import type { ModuleDest, ModuleTreeNode } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{
  node: ModuleTreeNode
  icon?: string
  iconOpen?: string
  link?: string | boolean
  linkQueryKey?: string
  padding?: number
  open?: boolean
}>(), {
  icon: 'i-catppuccin:folder icon-catppuccin',
  iconOpen: 'i-catppuccin:folder-open icon-catppuccin',
  padding: 0,
  linkQueryKey: 'module',
})

const emit = defineEmits<{
  (e: 'select', node: ModuleDest): void
}>()
const open = defineModel<boolean>('open', { required: false, default: true })
const route = useRoute()
const location = window.location
function select(node: ModuleDest) {
  if (!props.link) {
    emit('select', node)
  }
}
</script>

<template>
  <details :open="open" @toggle="e => open = (e.target as HTMLDetailsElement)?.open">
    <summary
      cursor-default
      select-none
      text-sm
      truncate
      :style="{ paddingLeft: `${padding + 0.5}rem` }"
      flex="~ gap-1"
      px2 py1 rounded
      hover="bg-active "
    >
      <div class="i-ph:caret-right-duotone transition op50" :class="open ? 'rotate-90' : ''" />
      <div :class="open ? iconOpen || icon : icon" inline-block vertical-text-bottom />
      <div font-mono>
        <DisplayHighlightedPath :path="node.name || ''" />
      </div>
    </summary>

    <template v-if="open">
      <DisplayTreeNode
        v-for="e of Object.entries(node.children)"
        :key="e[0]" :node="e[1]" :link="link"
        :padding="padding + 1"
        :link-query-key="linkQueryKey"
        @select="select"
      />
      <template v-for="i of node.items" :key="i.full">
        <component
          :is="link ? NuxtLink : 'div'"
          :to="link ? (typeof link === 'string' ? link : { path: route.path, query: { ...route.query, [linkQueryKey]: i.full }, hash: location.hash }) : undefined"
          text-sm
          ws-nowrap
          flex="~ gap-1"
          px2 py1 rounded
          hover="bg-active"
          :style="{ paddingLeft: `${padding + 2.7}rem` }"
          @click="select(i)"
        >
          <DisplayFileIcon :filename="i.full" />
          <div font-mono>
            <DisplayHighlightedPath :path="i.path.split('/').pop() || ''" />
          </div>
        </component>
      </template>
    </template>
  </details>
</template>
