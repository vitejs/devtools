<script setup lang="ts">
import type { ViteModuleDest, ViteModuleListItem } from '~/types/modules'
import { toTree } from '@vitejs/devtools-ui/utils/format'
import { computed } from 'vue'

const props = defineProps<{
  root: string
  modules: ViteModuleListItem[]
}>()

const moduleTree = computed(() => {
  if (!props.modules.length) {
    return {
      workspace: {
        children: {},
        items: [],
      },
      nodeModules: {
        children: {},
        items: [],
      },
      virtual: {
        children: {},
        items: [],
      },
    }
  }
  const inWorkspace: ViteModuleDest[] = []
  const inNodeModules: ViteModuleDest[] = []
  const inVirtual: ViteModuleDest[] = []

  props.modules.map(i => ({ full: i.id, path: i.path! })).forEach((i) => {
    if (i.full.startsWith(props.root)) {
      if (!i.path.startsWith('../'))
        i.path = i.full.slice(props.root.length + 1)

      inWorkspace.push(i)
    }
    else if (i.full.includes('node_modules')) {
      inNodeModules.push({
        full: i.full,
        path: i.full,
      })
    }
    else if (i.full.startsWith('virtual:') || i.full.startsWith('\0')) {
      inVirtual.push(i)
    }
  })

  return {
    workspace: toTree(inWorkspace, 'Project Root'),
    nodeModules: toTree(inNodeModules, 'Node Modules'),
    virtual: toTree(inVirtual, 'Virtual Modules'),
  }
})

const moduleTreeRoots = computed(() => {
  const tree = moduleTree.value
  return [
    {
      key: 'workspace',
      node: tree.workspace,
      icon: 'i-catppuccin:folder-dist icon-catppuccin',
      iconOpen: 'i-catppuccin:folder-dist-open icon-catppuccin',
    },
    {
      key: 'node-modules',
      node: tree.nodeModules,
      icon: 'i-catppuccin:folder-node icon-catppuccin',
      iconOpen: 'i-catppuccin:folder-node-open icon-catppuccin',
      open: false,
      dividerBefore: true,
    },
    {
      key: 'virtual',
      node: tree.virtual,
      icon: 'i-catppuccin:folder-components icon-catppuccin',
      iconOpen: 'i-catppuccin:folder-components-open icon-catppuccin',
      open: false,
      dividerBefore: true,
    },
  ]
})
</script>

<template>
  <DisplayVirtualTree
    class="relative"
    :roots="moduleTreeRoots"
    :link="true"
  />
</template>
