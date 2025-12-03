<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { computed, watch } from 'vue'
import { useModulePathSelector } from '~/composables/moduleGraph'

const props = defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', nodes: { start: string, end: string }): void
}>()

const modulesMap = computed(() => {
  const map = new Map<string, ModuleListItem>()
  props.modules.forEach((m) => {
    map.set(m.id, m)
  })
  return map
})

const startSelector = useModulePathSelector({
  getModules: () => {
    if (!startSelector.state.value.search) {
      return props.modules
    }
    else {
      return startSelector.fuse.value!.value?.search(startSelector.state.value.search).map(r => r.item) ?? []
    }
  },
})

startSelector.initSelector(computed(() => props.modules))

function getAllImports(moduleId: string, visited = new Set<string>()): ModuleListItem[] {
  if (visited.has(moduleId))
    return []
  visited.add(moduleId)

  const module = modulesMap.value.get(moduleId)
  if (!module?.imports?.length)
    return []

  const res: ModuleListItem[] = []

  for (const importItem of module.imports) {
    const importedModule = modulesMap.value.get(importItem.module_id)
    if (!importedModule)
      continue

    if (!visited.has(importedModule.id)) {
      res.push(importedModule)
      res.push(...getAllImports(importedModule.id, visited))
    }
  }

  return res
}

const endSelector = useModulePathSelector({
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
</script>

<template>
  <div h12 px4 p2 relative flex="~ gap2 items-center">
    <div flex="~ items-center gap2" class="flex-1" min-w-0>
      <ModulesPathSelectorItem
        v-model:search="startSelector.state.value.search"
        placeholder="Start"
        :selector="startSelector"
        :session="session"
        :modules="startSelector.modules.value"
        @clear="() => { startSelector.clear(); endSelector.clear() }"
      />
      <div class="i-carbon-arrow-right op50" flex-shrink-0 />

      <ModulesPathSelectorItem
        v-model:search="endSelector.state.value.search"
        placeholder="End"
        :selector="endSelector"
        :session="session"
        :modules="filteredEndModules"
        @clear="endSelector.clear"
      >
        <template #empty>
          <div flex="~ items-center justify-center" w-full h-20>
            <span italic op50>
              {{ startSelector.state.value.selected ? 'No modules' : 'Select a start module to get end modules' }}
            </span>
          </div>
        </template>
      </ModulesPathSelectorItem>
    </div>

    <DisplayCloseButton class="mr--2" @click="emit('close')" />
  </div>
</template>
