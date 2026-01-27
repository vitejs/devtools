<script setup lang="ts"  generic="T extends { id:string, imports: Record<string, unknown>[] }">
import type { SessionContext } from '~~/shared/types'
import type { GraphPathSelector } from '~/composables/graph-path-selector'
import DisplayCloseButton from '@vitejs/devtools-ui/components/DisplayCloseButton.vue'
import { computed, watch } from 'vue'
import { useGraphPathSelector } from '~/composables/graph-path-selector'

const props = defineProps<{
  session: SessionContext
  data: T[]
  importIdKey: string
  searchKeys?: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', nodes: { start: string, end: string }): void
}>()

defineSlots<{
  list: (props: {
    select: (module: T) => void
    data: T[]
  }) => void
  item: (props: {
    id: string
  }) => void
}>()

const dataMap = computed(() => {
  const map = new Map<string, T>()
  props.data.forEach((m) => {
    map.set(m.id, m)
  })
  return map
})

const startSelector: GraphPathSelector<T> = useGraphPathSelector<T>({
  searchKeys: props.searchKeys,
  getModules: () => {
    if (!startSelector.state.value.search) {
      return props.data
    }
    else {
      return startSelector.fuse.value!.value?.search(startSelector.state.value.search).map(r => r.item) ?? []
    }
  },
})

startSelector.initSelector(computed(() => props.data))

function getAllImports(moduleId: string, visited = new Set<string>()): T[] {
  if (visited.has(moduleId))
    return []
  visited.add(moduleId)

  const module = dataMap.value.get(moduleId)
  if (!module?.imports?.length)
    return []

  const res: T[] = []

  for (const importItem of module.imports) {
    const importedModule = dataMap.value.get(`${importItem[props.importIdKey]}`)
    if (!importedModule)
      continue

    if (!visited.has(importedModule.id)) {
      res.push(importedModule)
      res.push(...getAllImports(importedModule.id, visited))
    }
  }

  return res
}

const endSelector = useGraphPathSelector<T>({
  searchKeys: props.searchKeys,
  getModules: () => {
    return startSelector.state.value.selected ? getAllImports(startSelector.state.value.selected) : []
  },
})

endSelector.initSelector(endSelector.modules)

const filteredEndModules = computed(() => {
  if (!endSelector.state.value.search) {
    return endSelector.modules.value
  }
  else {
    return endSelector.fuse.value!.value?.search(endSelector.state.value.search).map(r => r.item) ?? []
  }
})

watch([() => startSelector.state.value.selected, () => endSelector.state.value.selected], () => {
  emit('select', {
    start: startSelector.state.value.selected ?? '',
    end: endSelector.state.value.selected ?? '',
  })
})

function close() {
  emit('select', {
    start: '',
    end: '',
  })
  emit('close')
}
</script>

<template>
  <div h10 px4 p1 relative flex="~ gap2 items-center">
    <div flex="~ items-center gap2" class="flex-1 h-full" min-w-0>
      <DataPathSelectorItem
        v-model:search="startSelector.state.value.search"
        placeholder="Start"
        :selector="startSelector"
        :session="session"
        :data="startSelector.modules.value"
        @clear="() => { startSelector.clear(); endSelector.clear() }"
      >
        <template #list>
          <slot name="list" :select="startSelector.select" :data="startSelector.modules.value" />
        </template>
        <template #item>
          <slot :id="startSelector.state.value.selected!" name="item" />
        </template>
      </DataPathSelectorItem>
      <div class="i-carbon-arrow-right op50" flex-shrink-0 />

      <DataPathSelectorItem
        v-model:search="endSelector.state.value.search"
        placeholder="End"
        :selector="endSelector"
        :session="session"
        :data="filteredEndModules"
        @clear="endSelector.clear"
      >
        <template #list>
          <slot name="list" :select="endSelector.select" :data="filteredEndModules" />
        </template>
        <template #item>
          <slot :id="endSelector.state.value.selected!" name="item" />
        </template>
        <template #empty>
          <div flex="~ items-center justify-center" w-full h-20>
            <span italic op50>
              {{ startSelector.state.value.selected ? 'No modules' : 'Select a start module to get end modules' }}
            </span>
          </div>
        </template>
      </DataPathSelectorItem>
    </div>

    <DisplayCloseButton class="mr--2" @click="close" />
  </div>
</template>
