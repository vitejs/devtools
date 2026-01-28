<script setup lang="ts">
import type { ModuleDest, RolldownAssetInfo, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { toTree } from '../../utils/format'

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
</script>

<template>
  <div flex="~ gap-2" p4>
    <DisplayTreeNode
      v-if="assets?.length"
      flex-1
      :node="assetTree"
      icon="i-catppuccin:folder-dist catppuccin"
      icon-open="i-catppuccin:folder-dist-open catppuccin"
      :link="true"
      link-query-key="asset"
    >
      <template #extra="{ node }">
        <span op50>
          ({{ assetsMap.get(node.full)?.chunk?.name?.replace(/[\[\]]/g, '') }})
        </span>
      </template>
    </DisplayTreeNode>
  </div>
</template>

<style scoped>

</style>
