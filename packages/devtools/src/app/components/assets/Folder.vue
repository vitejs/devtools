<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'
import type { ModuleDest, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { toTree } from '../../utils/format'

const props = defineProps<{
  assets: AssetInfo[]
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
</script>

<template>
  <div flex="~ gap-2">
    <DisplayTreeNode
      v-if="assets?.length"
      flex-1
      :node="assetTree"
      icon="i-catppuccin:folder-dist catppuccin"
      icon-open="i-catppuccin:folder-dist-open catppuccin"
      :link="true"
      link-query-key="asset"
    />
  </div>
</template>

<style scoped>

</style>
