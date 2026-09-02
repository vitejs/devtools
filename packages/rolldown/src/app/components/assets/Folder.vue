<script setup lang="ts">
import type { ModuleDest, RolldownAssetInfo, SessionContext } from '~~/shared/types'
import { toTree } from '@vitejs/devtools-ui/utils/format'
import { computed } from 'vue'
import DisplayVirtualTree from '../display/VirtualTree.vue'

const props = defineProps<{
  assets: RolldownAssetInfo[]
  session: SessionContext
}>()
const assetTree = computed(() => {
  const nodes: ModuleDest[] = []
  props.assets.forEach((i) => {
    nodes.push({
      full: i.filename,
      path: i.filename,
    })
  })
  return toTree(nodes, 'Project')
})

const assetsMap = computed(() => new Map<string, RolldownAssetInfo>(props.assets.map(a => [a.filename, a])))

const assetTreeRoots = computed(() => [
  {
    key: 'assets',
    node: assetTree.value,
    icon: 'i-catppuccin:folder-dist catppuccin',
    iconOpen: 'i-catppuccin:folder-dist-open catppuccin',
  },
])
</script>

<template>
  <DisplayVirtualTree
    v-if="assets?.length"
    :roots="assetTreeRoots"
    :link="true"
    link-query-key="asset"
  >
    <template #extra="{ node }">
      <span class="op50">
        ({{ assetsMap.get(node.full)?.chunk?.name?.replace(/[\[\]]/g, '') }})
      </span>
    </template>
  </DisplayVirtualTree>
</template>

<style scoped>

</style>
