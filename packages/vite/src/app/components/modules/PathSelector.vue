<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { hideAllPoppers, Menu as VMenu } from 'floating-vue'
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
      <div flex-1 w-0>
        <div v-if="startSelector.state.value.selected" w-full overflow-hidden flex="~ items-center" border="~ base rounded" p1 relative>
          <div overflow-hidden text-ellipsis pr6 py0.5 w-0 flex-1>
            <DisplayModuleId
              :id="startSelector.state.value.selected"
              :session="session"
              block text-nowrap
              :link="false"
              :disable-tooltip="true"
            />
          </div>
          <button i-carbon-clean text-4 hover="op100" op50 title="Clear" absolute right-2 @click="startSelector.clear" />
        </div>
        <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 150 }">
          <input
            v-model="startSelector.state.value.search"
            p1 px4 w-full border="~ base rounded-1" style="outline: none"
            placeholder="Start"
            @blur="hideAllPoppers"
          >
          <template #popper>
            <div class="p2 w100" flex="~ col gap2">
              <ModulesFlatList
                :session="session"
                :modules="startSelector.modules.value"
                disable-tooltip
                :link="false"
                @select="startSelector.select"
              />
            </div>
          </template>
        </VMenu>
      </div>
      <div class="i-carbon-arrow-right op50" flex-shrink-0 />

      <div flex-1 w-0>
        <div v-if="endSelector.state.value.selected" w-full overflow-hidden flex="~ items-center" border="~ base rounded" p1 relative>
          <div overflow-hidden text-ellipsis pr6 py0.5 w-0 flex-1>
            <DisplayModuleId
              :id="endSelector.state.value.selected"
              :session="session"
              block text-nowrap
              :link="false"
              :disable-tooltip="true"
            />
          </div>
          <button i-carbon-clean text-4 hover="op100" op50 title="Clear" absolute right-2 @click="() => { startSelector.clear() ; endSelector.clear() }" />
        </div>
        <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 150 }">
          <input
            v-model="endSelector.state.value.search"
            p1 px4 w-full border="~ base rounded-1" style="outline: none"
            placeholder="End"
            @blur="hideAllPoppers"
          >
          <template #popper>
            <div class="p2 w100" flex="~ col gap2">
              <ModulesFlatList
                v-if="filteredEndModules.length"
                :session="session"
                :modules="filteredEndModules"
                disable-tooltip
                :link="false"
                @select="endSelector.select"
              />
              <div v-else flex="~ items-center justify-center" w-full h-20>
                <span italic op50>
                  {{ startSelector.state.value.selected ? 'No modules' : 'Select a start module to get end modules' }}
                </span>
              </div>
            </div>
          </template>
        </VMenu>
      </div>
    </div>

    <DisplayCloseButton class="mr--2" @click="emit('close')" />
  </div>
</template>
