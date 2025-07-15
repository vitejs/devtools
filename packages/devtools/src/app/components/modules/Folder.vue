<script setup lang="ts">
import type { ModuleDest, ModuleListItem, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { toTree } from '../../utils/format'

const props = defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const moduleTree = computed(() => {
  if (!props.session.modulesList.length) {
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
  const inWorkspace: ModuleDest[] = []
  const inNodeModules: ModuleDest[] = []
  const inVirtual: ModuleDest[] = []

  props.modules.map(i => ({ full: i.id, path: i.path! })).forEach((i) => {
    if (i.full.startsWith(props.session.meta.cwd)) {
      if (!i.path.startsWith('../')) {
        i.path = i.full.slice(props.session.meta.cwd.length + 1)
      }

      inWorkspace.push(i)
    }
    else if (i.full.includes('node_modules')) {
      inNodeModules.push({
        full: i.full,
        path: i.full,
      })
    }
    else if (i.full.startsWith('virtual:')) {
      inVirtual.push(i)
    }
  })

  return {
    workspace: toTree(inWorkspace, 'Project Root'),
    nodeModules: toTree(inNodeModules, 'Node Modules'),
    virtual: toTree(inVirtual, 'Virtual Modules'),
  }
})
</script>

<template>
  <div of-auto max-h-screen pt-40 relative>
    <div flex="~ col gap-2" p4>
      <DisplayTreeNode
        v-if="Object.keys(moduleTree.workspace.children).length"
        :node="moduleTree.workspace"
        p="l3"
        icon="i-catppuccin:folder-dist icon-catppuccin"
        icon-open="i-catppuccin:folder-dist-open icon-catppuccin"
        :link="true"
      />

      <template v-if="Object.keys(moduleTree.nodeModules.children).length">
        <div w-full h-1px border="t base" />
        <DisplayTreeNode
          :node="moduleTree.nodeModules"
          p="l3"
          icon="i-catppuccin:folder-node icon-catppuccin"
          icon-open="i-catppuccin:folder-node-open icon-catppuccin"
          :link="true"
          :open="false"
        />
      </template>

      <template v-if="Object.keys(moduleTree.virtual.children).length">
        <div w-full h-1px border="t base" />
        <DisplayTreeNode
          :node="moduleTree.virtual"
          p="l3"
          icon="i-catppuccin:folder-components icon-catppuccin"
          icon-open="i-catppuccin:folder-components-open icon-catppuccin"
          :link="true"
          :open="false"
        />
      </template>
    </div>
  </div>
</template>
