<script setup lang="ts">
import type { Asset } from '@rolldown/debug'
import type { ModuleDest, SessionContext } from '~~/shared/types'
import { useRouter } from '#app/composables/router'
import { computed, ref } from 'vue'
import { toTree } from '../../utils/format'

const props = defineProps<{
  assets: Asset[]
  session: SessionContext
}>()
const router = useRouter()
const selected = ref('')
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

function select(node: ModuleDest) {
  selected.value = node.path
  router.replace({
    query: {
      asset: node.path,
    },
  })
}
</script>

<template>
  <div flex="~ gap-2">
    <DisplayTreeNode
      v-if="assets?.length"
      flex-1
      :node="assetTree"
      icon="i-catppuccin:folder-dist catppuccin"
      icon-open="i-catppuccin:folder-dist-open catppuccin"
      :link="false"
      @select="select"
    />
  </div>
</template>

<style scoped>

</style>
