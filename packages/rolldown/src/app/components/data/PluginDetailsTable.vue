<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import type { FilterMatchRule } from '~/utils/icon'
import DataVirtualList from '@vitejs/devtools-ui/components/Data/DataVirtualList.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import { normalizeTimestamp } from '@vitejs/devtools-ui/utils/format'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { computed, ref } from 'vue'
import { settings } from '~~/app/state/settings'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
  selectedFields: string[]
}>()

const HOOK_NAME_MAP = {
  resolve: 'Resolve Id',
  load: 'Load',
  transform: 'Transform',
}

const parsedPaths = computed(() => props.session.modulesList.map((mod) => {
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    type,
  }
}))

const searchFilterTypes = computed(() => ModuleTypeRules.filter(rule => parsedPaths.value.some(mod => rule.match.test(mod.mod.id))))
const moduleTypeNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const { mod, type } of parsedPaths.value) {
    map.set(mod.id, type.name)
  }
  return map
})

const filterModuleTypes = ref<string[]>(settings.value.pluginDetailsModuleTypes ?? searchFilterTypes.value.map(i => i.name))
const selectedModuleTypes = computed(() => new Set(filterModuleTypes.value))
const { state: durationSortType, next } = useCycleList(['', 'desc', 'asc'], {
  initialValue: settings.value.pluginDetailsDurationSortType,
})
const filtered = computed(() => {
  const selectedHook = settings.value.pluginDetailSelectedHook
  const showType = settings.value.pluginDetailsShowType
  const shouldFilterChangedState = showType !== 'all' && ['load', 'transform'].includes(selectedHook)
  const typeNameCache = new Map(moduleTypeNameMap.value)
  const result: RolldownPluginBuildMetrics['calls'] = []

  for (const item of props.buildMetrics.calls) {
    if (!item.module)
      continue
    if (selectedHook && item.type !== selectedHook)
      continue
    if (shouldFilterChangedState && (showType === 'changed' ? item.unchanged : !item.unchanged))
      continue

    let moduleType = typeNameCache.get(item.module)
    if (!moduleType) {
      moduleType = getFileTypeFromModuleId(item.module).name
      typeNameCache.set(item.module, moduleType)
    }
    if (!selectedModuleTypes.value.has(moduleType))
      continue

    result.push(item)
  }

  if (durationSortType.value) {
    result.sort((a, b) => {
      if (durationSortType.value === 'asc') {
        return a.duration - b.duration
      }
      return b.duration - a.duration
    })
  }

  return result
})

function toggleModuleType(rule: FilterMatchRule) {
  if (filterModuleTypes.value?.includes(rule.name)) {
    filterModuleTypes.value = filterModuleTypes.value?.filter(t => t !== rule.name)
  }
  else {
    filterModuleTypes.value?.push(rule.name)
  }
  settings.value.pluginDetailsModuleTypes = filterModuleTypes.value
}

function toggleDurationSortType() {
  next()
  settings.value.pluginDetailsDurationSortType = durationSortType.value
}
</script>

<template>
  <DataVirtualList
    v-if="filtered.length && selectedFields.length"
    class="plugin-details-table"
    role="table"
    min-w-max h-full min-h-0
    :items="filtered"
    key-prop="id"
    :page-mode="false"
    scroller="fixed"
    :item-size="36"
  >
    <template #before>
      <div role="row" class="border-b border-base bg-base" flex="~ row">
        <div v-if="selectedFields.includes('hookName')" role="columnheader" bg-base flex-none w32 ws-nowrap p1 text-center font-600>
          Hook name
        </div>
        <div v-if="selectedFields.includes('module')" role="columnheader" bg-base flex-1 min-w100 ws-nowrap p1 text-left font-600>
          <button flex="~ row gap1 items-center" w-full>
            Module
            <VMenu>
              <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
                <i text-xs class="i-ph-funnel-duotone" :class="filterModuleTypes.length !== searchFilterTypes.length ? 'text-primary op100' : 'op50'" />
              </span>
              <template #popper>
                <div class="p2" flex="~ col gap2">
                  <label
                    v-for="rule of searchFilterTypes"
                    :key="rule.name"
                    border="~ base rounded-md" px2 py1
                    flex="~ items-center gap-1"
                    select-none
                    :title="rule.description"
                    class="cursor-pointer module-type-filter"
                  >
                    <input
                      type="checkbox"
                      mr1
                      :checked="filterModuleTypes?.includes(rule.name)"
                      @change="toggleModuleType(rule)"
                    >
                    <div :class="rule.icon" icon-catppuccin />
                    <div text-sm>{{ rule.description || rule.name }}</div>
                  </label>
                </div>
              </template>
            </VMenu>
          </button>
        </div>
        <div v-if="selectedFields.includes('duration')" role="columnheader" rounded-tr-2 bg-base flex-none ws-nowrap p1 text-center font-600 w-27>
          <button flex="~ row gap1 items-center justify-center" w-full @click="toggleDurationSortType">
            Duration
            <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
              <i text-xs :class="[durationSortType !== 'asc' ? 'i-ph-arrow-down-duotone' : 'i-ph-arrow-up-duotone', durationSortType ? 'op100 text-primary' : 'op50']" />
            </span>
          </button>
        </div>
        <div v-if="selectedFields.includes('startTime')" role="columnheader" rounded-tr-2 bg-base flex-none min-w52 ws-nowrap p1 text-center font-600>
          Start Time
        </div>
        <div v-if="selectedFields.includes('endTime')" role="columnheader" rounded-tr-2 bg-base flex-none min-w52 ws-nowrap p1 text-center font-600>
          End Time
        </div>
      </div>
    </template>

    <template #default="{ item, index }">
      <div
        role="row"
        flex="~ row"
        h-9
        class="border-base border-b border-dashed"
        :class="[index === filtered.length - 1 ? 'border-b-0' : '']"
      >
        <div v-if="selectedFields.includes('hookName')" role="cell" flex="~ items-center justify-center" flex-none w32 ws-nowrap op80>
          <DisplayBadge :text="HOOK_NAME_MAP[item.type]" />
        </div>
        <div v-if="selectedFields.includes('module')" role="cell" flex-1 min-w100 text-left text-ellipsis line-clamp-2>
          <DisplayModuleId
            :id="item.module"
            w-full border-none ws-nowrap
            :session="session"
            :link="`/session/${session.id}/graph?module=${item.module}`"
            hover="bg-active"
            border="~ base rounded" block px2 py1
          />
        </div>
        <div v-if="selectedFields.includes('duration')" role="cell" flex="~ items-center justify-center" flex-none text-center text-sm w-27>
          <DisplayDuration :duration="item.duration" />
        </div>
        <div v-if="selectedFields.includes('startTime')" role="cell" flex="~ items-center justify-center" flex-none text-center font-mono text-sm min-w52 op80>
          {{ normalizeTimestamp(item.timestamp_start) }}
        </div>
        <div v-if="selectedFields.includes('endTime')" role="cell" flex="~ items-center justify-center" flex-none text-center font-mono text-sm min-w52 op80>
          {{ normalizeTimestamp(item.timestamp_end) }}
        </div>
      </div>
    </template>
  </DataVirtualList>
  <div v-else role="table" min-w-max h-full>
    <div p4>
      <div w-full h-48 flex="~ items-center justify-center" op50 italic>
        <p v-if="!selectedFields.length">
          No columns selected
        </p>
        <p v-else>
          No data
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-details-table:deep(.vue-recycle-scroller__slot) {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
