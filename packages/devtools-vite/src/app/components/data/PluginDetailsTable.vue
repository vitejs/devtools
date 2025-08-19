<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import type { FilterMatchRule } from '~/utils/icon'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { computed, ref } from 'vue'
import { settings } from '~~/app/state/settings'
import { parseReadablePath } from '~/utils/filepath'
import { normalizeTimestamp } from '~/utils/format'
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
  const path = parseReadablePath(mod.id, props.session.meta.cwd)
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    path,
    type,
  }
}))

const searchFilterTypes = computed(() => ModuleTypeRules.filter(rule => parsedPaths.value.some(mod => rule.match.test(mod.mod.id))))

const filterModuleTypes = ref<string[]>(settings.value.pluginDetailsModuleTypes ?? searchFilterTypes.value.map(i => i.name))
const { state: durationSortType, next } = useCycleList(['', 'desc', 'asc'], {
  initialValue: settings.value.pluginDetailsDurationSortType,
})
const filtered = computed(() => {
  const sorted = durationSortType.value
    ? [...props.buildMetrics.calls].sort((a, b) => {
        if (durationSortType.value === 'asc') {
          return a.duration - b.duration
        }
        return b.duration - a.duration
      })
    : props.buildMetrics.calls
  return sorted.filter((i) => {
    if (!i.module)
      return false
    const matched = getFileTypeFromModuleId(i.module)
    return filterModuleTypes.value.includes(matched.name)
  }).filter(settings.value.pluginDetailSelectedHook ? i => i.type === settings.value.pluginDetailSelectedHook : Boolean)
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
  <div role="table" w-full>
    <div role="row" class="sticky top-0 z10 border-b border-base" flex="~ row">
      <div v-if="selectedFields.includes('hookName')" role="columnheader" bg-base flex-none w32 ws-nowrap p1 text-center font-600>
        Hook name
      </div>
      <div v-if="selectedFields.includes('module')" role="columnheader" bg-base flex-1 min-w100 ws-nowrap p1 text-left font-600>
        <button flex="~ row gap1 items-center" w-full>
          Module
          <VMenu>
            <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
              <i text-xs class="i-carbon-filter" :class="filterModuleTypes.length !== searchFilterTypes.length ? 'text-primary op100' : 'op50'" />
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
      <div v-if="selectedFields.includes('startTime')" role="columnheader" rounded-tr-2 bg-base flex-none min-w52 ws-nowrap p1 text-center font-600>
        Start Time
      </div>
      <div v-if="selectedFields.includes('endTime')" role="columnheader" rounded-tr-2 bg-base flex-none min-w52 ws-nowrap p1 text-center font-600>
        End Time
      </div>
      <div v-if="selectedFields.includes('duration')" role="columnheader" rounded-tr-2 bg-base flex-none ws-nowrap p1 text-center font-600 w-27>
        <button flex="~ row gap1 items-center justify-center" w-full @click="toggleDurationSortType">
          Duration
          <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
            <i text-xs :class="[durationSortType !== 'asc' ? 'i-carbon-arrow-down' : 'i-carbon-arrow-up', durationSortType ? 'op100 text-primary' : 'op50']" />
          </span>
        </button>
      </div>
    </div>

    <DataVirtualList
      v-if="filtered.length && selectedFields.length"
      role="rowgroup"
      :items="filtered"
      key-prop="id"
    >
      <template #default="{ item, index }">
        <div
          role="row"
          flex="~ row"
          class="border-base border-b-1 border-dashed"
          :class="[index === filtered.length - 1 ? 'border-b-0' : '']"
        >
          <div v-if="selectedFields.includes('hookName')" role="cell" flex="~ items-center justify-center" flex-none w32 ws-nowrap text-sm op80>
            {{ HOOK_NAME_MAP[item.type] }}
          </div>
          <div v-if="selectedFields.includes('module')" role="cell" flex-1 min-w100 text-left text-ellipsis line-clamp-2>
            <DisplayModuleId
              :id="item.module"
              w-full border-none
              :session="session"
              :link="`/session/${session.id}/graph?module=${item.module}`"
              hover="bg-active"
              border="~ base rounded" block px2 py1
            />
          </div>
          <div v-if="selectedFields.includes('startTime')" role="cell" flex="~ items-center justify-center" flex-none text-center font-mono text-sm min-w52 op80>
            <time v-if="item.timestamp_start" :datetime="new Date(item.timestamp_start).toISOString()">{{ normalizeTimestamp(item.timestamp_start) }}</time>
          </div>
          <div v-if="selectedFields.includes('endTime')" role="cell" flex="~ items-center justify-center" flex-none text-center font-mono text-sm min-w52 op80>
            <time v-if="item.timestamp_end" :datetime="new Date(item.timestamp_end).toISOString()">{{ normalizeTimestamp(item.timestamp_end) }}</time>
          </div>
          <div v-if="selectedFields.includes('duration')" role="cell" flex="~ items-center justify-center" flex-none text-center text-sm w-27>
            <DisplayDuration :duration="item.duration" />
          </div>
        </div>
      </template>
    </DataVirtualList>
    <div v-else>
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
  </div>
</template>
