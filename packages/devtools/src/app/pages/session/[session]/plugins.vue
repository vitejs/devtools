<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { uniqueBy } from '@antfu/utils'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'
import { getPluginTypeFromName } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
}>()

const searchValue = ref<{ search: string, selected: string[] | null }>()

const searchFilterTypes = computed(() => {
  const { plugins = [] } = props.session?.meta
  function getPluginType(input: string): string {
    const match = input.match(/^([^:]+):/)
    return match ? match[1] : ''
  }
  const pluginTypes = plugins.map((item) => {
    const type = getPluginType(item.name)
    const { description: label, name: value, icon } = getPluginTypeFromName(type)
    return {
      label,
      value,
      icon,
    }
  })
  return uniqueBy(pluginTypes, (a, b) => a.value === b.value)
})
</script>

<template>
  <div relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :filter-types="searchFilterTypes" />
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt32>
      <PluginsFlatList :plugins="session?.meta?.plugins ?? []" />
      <div
        absolute bottom-4 py-1 px-2 bg-glass left="1/2" translate-x="-1/2" border="~ base rounded-full" text="center xs"
      >
        <span op50>{{ }} of {{ session?.meta?.plugins?.length || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<!--
      TODO: plugins framegraph
        Two different views direction:
          - plugins -> hooks -> modules
          - modules -> hooks -> plugins
-->
