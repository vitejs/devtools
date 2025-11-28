<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { computedWithControl } from '@vueuse/core'
import { hideAllPoppers, Menu as VMenu } from 'floating-vue'
import Fuse from 'fuse.js'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', nodes: { start: string, end: string }): void
}>()

const searchStart = ref<{
  search: string
  selected: string | null
}>({
  search: '',
  selected: null,
})

const modulesMap = computed(() => {
  const map = new Map<string, ModuleListItem>()
  props.modules.forEach((m) => {
    map.set(m.id, m)
  })
  return map
})

const startFuse = computedWithControl(
  () => props.modules,
  () => new Fuse(props.modules, {
    includeScore: true,
    keys: ['id'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const startModules = computed(() => {
  if (!searchStart.value.search) {
    return props.modules
  }
  else {
    return startFuse.value
      .search(searchStart.value.search)
      .map(r => r.item)
  }
})

const endModules = computed(() => {
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

  return searchStart.value.selected ? getAllImports(searchStart.value.selected) : []
})

const endFuse = computedWithControl(
  () => endModules.value,
  () => new Fuse(endModules.value, {
    includeScore: true,
    keys: ['id'],
    ignoreLocation: true,
    threshold: 0.4,
  }),
)

const searchEnd = ref<{
  search: string
  selected: string | null
}>({
  search: '',
  selected: null,
})

const filteredEndModules = computed(() => {
  if (!searchEnd.value.search) {
    return endModules.value
  }
  else {
    return endFuse.value
      .search(searchEnd.value.search)
      .map(r => r.item)
  }
})

function selectStartNode(node: ModuleListItem) {
  searchStart.value.selected = node.id
  searchStart.value.search = ''
}

function selectEndNode(node: ModuleListItem) {
  searchEnd.value.selected = node.id
  searchEnd.value.search = ''
}

function clearSelected(type: 'start' | 'end') {
  if (type === 'start') {
    searchStart.value.selected = null
  }
  searchEnd.value.selected = null
}

watch([() => searchStart.value.selected, () => searchEnd.value.selected], () => {
  emit('select', {
    start: searchStart.value.selected ?? '',
    end: searchEnd.value.selected ?? '',
  })
})
</script>

<template>
  <div h12 px4 p2 relative flex="~ gap2 items-center">
    <div flex="~ items-center gap2" class="flex-1" min-w-0>
      <div flex-1 w-0>
        <div v-if="searchStart.selected" w-full overflow-hidden flex="~ items-center" border="~ base rounded" p1 relative>
          <div overflow-hidden text-ellipsis pr6 py0.5 w-0 flex-1>
            <DisplayModuleId
              :id="searchStart.selected"
              :session="session"
              block text-nowrap
              :link="false"
              :disable-tooltip="true"
            />
          </div>
          <button i-carbon-clean text-4 hover="op100" op50 title="Clear" absolute right-2 @click="clearSelected('start')" />
        </div>
        <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 120 }">
          <input
            v-model="searchStart.search"
            p1 px4 w-full border="~ base rounded-1" style="outline: none"
            placeholder="Start"
            @blur="hideAllPoppers"
          >
          <template #popper>
            <div class="p2 w100" flex="~ col gap2">
              <ModulesFlatList
                :session="session"
                :modules="startModules"
                disable-tooltip
                :link="false"
                @select="selectStartNode"
              />
            </div>
          </template>
        </VMenu>
      </div>
      <div class="i-carbon-arrow-right op50" flex-shrink-0 />

      <div flex-1 w-0>
        <div v-if="searchEnd.selected" w-full overflow-hidden flex="~ items-center" border="~ base rounded" p1 relative>
          <div overflow-hidden text-ellipsis pr6 py0.5 w-0 flex-1>
            <DisplayModuleId
              :id="searchEnd.selected"
              :session="session"
              block text-nowrap
              :link="false"
              :disable-tooltip="true"
            />
          </div>
          <button i-carbon-clean text-4 hover="op100" op50 title="Clear" absolute right-2 @click="clearSelected('end')" />
        </div>
        <VMenu v-else :distance="15" :triggers="['click']" :auto-hide="false" :delay="{ show: 300, hide: 120 }">
          <input
            v-model="searchEnd.search"
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
                @select="selectEndNode"
              />
              <div v-else flex="~ items-center justify-center" w-full h-20>
                <span italic op50>
                  No modules
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
