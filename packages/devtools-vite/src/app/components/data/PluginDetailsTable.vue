<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import type { FilterMatchRule } from '~/utils/icon'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { computed, ref } from 'vue'
import { settings } from '~~/app/state/settings'
import { parseReadablePath } from '~/utils/filepath'
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

function normalizeTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

function toggleDurationSortType() {
  next()
  settings.value.pluginDetailsDurationSortType = durationSortType.value
}
</script>

<template>
  <table w-full border-separate border-spacing-0>
    <thead border="b base">
      <tr px2 class="[&_th]:(sticky top-0 z10 border-b border-base)">
        <th v-if="selectedFields.includes('hookName')" bg-base w32 ws-nowrap p1 text-center font-600>
          Hook name
        </th>
        <th v-if="selectedFields.includes('module')" bg-base min-w100 ws-nowrap p1 text-left font-600>
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
        </th>
        <th v-if="selectedFields.includes('startTime')" rounded-tr-2 bg-base ws-nowrap p1 text-center font-600>
          Start Time
        </th>
        <th v-if="selectedFields.includes('endTime')" rounded-tr-2 bg-base ws-nowrap p1 text-center font-600>
          End Time
        </th>
        <th v-if="selectedFields.includes('duration')" rounded-tr-2 bg-base ws-nowrap p1 text-center font-600>
          <button flex="~ row gap1 items-center justify-center" w-full @click="toggleDurationSortType">
            Duration
            <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
              <i text-xs :class="[durationSortType !== 'asc' ? 'i-carbon-arrow-down' : 'i-carbon-arrow-up', durationSortType ? 'op100 text-primary' : 'op50']" />
            </span>
          </button>
        </th>
      </tr>
    </thead>
    <tbody v-if="filtered.length">
      <tr v-for="(item, index) in filtered" :key="item.id" class="[&_td]:(border-base border-b-1 border-dashed)" :class="[index === filtered.length - 1 ? '[&_td]:(border-b-0)' : '']">
        <td v-if="selectedFields.includes('hookName')" w32 ws-nowrap text-center text-sm op80>
          {{ HOOK_NAME_MAP[item.type] }}
        </td>
        <td v-if="selectedFields.includes('module')" min-w100 text-left text-ellipsis line-clamp-2>
          <DisplayModuleId
            :id="item.module"
            w-full border-none
            :session="session"
            :link="`/session/${session.id}/graph?module=${item.module}`"
            hover="bg-active"
            border="~ base rounded" block px2 py1
          />
        </td>
        <td v-if="selectedFields.includes('startTime')" text-center font-mono text-sm min-w52 op80>
          <time v-if="item.timestamp_start" :datetime="new Date(item.timestamp_start).toISOString()">{{ normalizeTimestamp(item.timestamp_start) }}</time>
        </td>
        <td v-if="selectedFields.includes('endTime')" text-center font-mono text-sm min-w52 op80>
          <time v-if="item.timestamp_end" :datetime="new Date(item.timestamp_end).toISOString()">{{ normalizeTimestamp(item.timestamp_end) }}</time>
        </td>
        <td v-if="selectedFields.includes('duration')" text-center text-sm>
          <DisplayDuration :duration="item.duration" />
        </td>
      </tr>
    </tbody>
    <tbody v-else>
      <tr>
        <td :colspan="selectedFields.length" p4>
          <div w-full h-48 flex="~ items-center justify-center" op50 italic>
            No data
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
