<script setup lang="ts">
import type { ViteModuleDest, ViteModuleTreeNode } from '~/types/modules'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'
import { computed, reactive } from 'vue'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'

interface VirtualTreeRoot {
  key: string
  node: ViteModuleTreeNode
  icon?: string
  iconOpen?: string
  open?: boolean
  dividerBefore?: boolean
}

interface FolderRow {
  type: 'folder'
  key: string
  node: ViteModuleTreeNode
  depth: number
  defaultOpen: boolean
  icon: string
  iconOpen: string
}

interface ItemRow {
  type: 'item'
  key: string
  item: ViteModuleDest
  depth: number
}

interface DividerRow {
  type: 'divider'
  key: string
}

type TreeRow = FolderRow | ItemRow | DividerRow

const props = withDefaults(defineProps<{
  roots: VirtualTreeRoot[]
  link?: string | boolean
  linkQueryKey?: string
  itemSize?: number
  pageMode?: boolean
  scroller?: 'fixed' | 'window'
}>(), {
  linkQueryKey: 'module',
  itemSize: 28,
  pageMode: true,
  scroller: 'window',
})

const emit = defineEmits<{
  (e: 'select', node: ViteModuleDest): void
}>()

defineSlots<{
  extra?: (props: { node: ViteModuleDest }) => any
}>()

const route = useRoute()
const openState = reactive(new Map<string, boolean>())

const folderIcon = 'i-catppuccin:folder icon-catppuccin'
const folderOpenIcon = 'i-catppuccin:folder-open icon-catppuccin'

function hasContent(node: ViteModuleTreeNode) {
  return node.items.length > 0 || Object.keys(node.children).length > 0
}

function isFolderOpen(row: FolderRow) {
  return openState.get(row.key) ?? row.defaultOpen
}

function toggleFolder(row: FolderRow) {
  openState.set(row.key, !isFolderOpen(row))
}

function appendNodeRows(
  rows: TreeRow[],
  node: ViteModuleTreeNode,
  options: {
    sectionKey: string
    path: string[]
    depth: number
    defaultOpen: boolean
    icon?: string
    iconOpen?: string
  },
) {
  const folderKey = `${options.sectionKey}:folder:${options.path.join('/') || '__root'}`
  const row: FolderRow = {
    type: 'folder',
    key: folderKey,
    node,
    depth: options.depth,
    defaultOpen: options.defaultOpen,
    icon: options.icon ?? folderIcon,
    iconOpen: options.iconOpen ?? folderOpenIcon,
  }

  rows.push(row)

  if (!isFolderOpen(row))
    return

  for (const [childKey, child] of Object.entries(node.children)) {
    appendNodeRows(rows, child, {
      sectionKey: options.sectionKey,
      path: [...options.path, child.name || childKey],
      depth: options.depth + 1,
      defaultOpen: true,
    })
  }

  for (const item of node.items) {
    rows.push({
      type: 'item',
      key: `${options.sectionKey}:item:${item.full}`,
      item,
      depth: options.depth,
    })
  }
}

const rows = computed<TreeRow[]>(() => {
  const rows: TreeRow[] = []
  for (const root of props.roots) {
    if (!hasContent(root.node))
      continue

    if (root.dividerBefore && rows.length) {
      rows.push({
        type: 'divider',
        key: `${root.key}:divider`,
      })
    }

    appendNodeRows(rows, root.node, {
      sectionKey: root.key,
      path: [],
      depth: 0,
      defaultOpen: root.open ?? true,
      icon: root.icon,
      iconOpen: root.iconOpen,
    })
  }
  return rows
})

function getItemName(item: ViteModuleDest) {
  return item.path.split('/').pop() || ''
}

function getItemLink(item: ViteModuleDest) {
  if (typeof props.link === 'string')
    return props.link

  return {
    path: route.path,
    query: {
      ...route.query,
      [props.linkQueryKey]: item.full,
    },
    hash: route.hash,
  }
}

function select(node: ViteModuleDest) {
  if (!props.link)
    emit('select', node)
}
</script>

<template>
  <div class="p4">
    <DataVirtualList
      :items="rows"
      key-prop="key"
      :item-size="itemSize"
      :page-mode="pageMode"
      :scroller="scroller"
    >
      <template #default="{ item: row }">
        <div v-if="row.type === 'divider'" class="h-7 flex items-center">
          <div class="w-full border-t border-base" />
        </div>

        <button
          v-else-if="row.type === 'folder'"
          type="button"
          class="h-7 w-full min-w-0 cursor-default select-none text-sm truncate flex gap-1 items-center px2 rounded bg-transparent text-left hover:bg-active"
          :aria-expanded="isFolderOpen(row)"
          :style="{ paddingLeft: `${row.depth + 0.5}rem` }"
          @click="toggleFolder(row)"
        >
          <div
            class="i-ph-caret-right-duotone transition op50 shrink-0"
            :class="isFolderOpen(row) ? 'rotate-90' : ''"
          />
          <div :class="isFolderOpen(row) ? row.iconOpen || row.icon : row.icon" class="inline-block vertical-text-bottom shrink-0" />
          <div class="font-mono truncate">
            <DisplayHighlightedPath :path="row.node.name || ''" />
          </div>
        </button>

        <component
          :is="link ? NuxtLink : 'div'"
          v-else
          :to="link ? getItemLink(row.item) : undefined"
          class="h-7 min-w-0 text-sm ws-nowrap flex gap-1 items-center px2 rounded hover:bg-active"
          :style="{ paddingLeft: `${row.depth + 2.7}rem` }"
          @click="select(row.item)"
        >
          <DisplayFileIcon :filename="row.item.full" class="shrink-0" />
          <div class="font-mono min-w-0 truncate">
            <DisplayHighlightedPath :path="getItemName(row.item)" />
            <slot name="extra" :node="row.item" />
          </div>
        </component>
      </template>
    </DataVirtualList>
  </div>
</template>
