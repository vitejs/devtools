<script setup lang="ts">
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types/data'
import type { FilterMatchRule } from '~/utils/icon'
import { useRoute, useRouter } from '#app/composables/router'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { computed, ref } from 'vue'
import { parseReadablePath } from '~/utils/filepath'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()

const route = useRoute()
const router = useRouter()
const parsedPaths = computed(() => props.session.modulesList.map((mod) => {
  const path = parseReadablePath(mod.id, props.session.meta.cwd)
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    path,
    type,
  }
}))

const searchFilterTypes = computed(() => {
  return ModuleTypeRules.filter((rule) => {
    return parsedPaths.value.some(mod => rule.match.test(mod.mod.id))
  })
})

const filterModuleTypes = ref<string[]>((route.query.module_types ? (route.query.module_types as string).split(',') : searchFilterTypes.value.map(i => i.name)) as string[])
const { state: durationSortType, next } = useCycleList(['', 'desc', 'asc'], {
  initialValue: route.query.duration_sort ?? '',
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
  })
})

function toggleModuleType(rule: FilterMatchRule) {
  if (filterModuleTypes.value?.includes(rule.name)) {
    filterModuleTypes.value = filterModuleTypes.value?.filter(t => t !== rule.name)
  }
  else {
    filterModuleTypes.value?.push(rule.name)
  }
  router.replace({
    query: {
      ...route.query,
      module_types: filterModuleTypes.value?.join(','),
    },
  })
}

function toggleDurationSortType() {
  next()
  router.replace({
    query: { ...route.query, duration_sort: durationSortType.value ? durationSortType.value : undefined },
  })
}
</script>

<template>
  <table w-full border-separate border-spacing-0>
    <thead border="b base">
      <tr px2>
        <th sticky top-0 z10 border="b base" bg-base w32 ws-nowrap p1 text-center font-600>
          Hook name
        </th>
        <th sticky top-0 z10 border="b base" bg-base w160 ws-nowrap p1 text-left font-600>
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
        <th sticky top-0 z10 border="b base" rounded-tr-2 bg-base ws-nowrap p1 text-center font-600>
          <button flex="~ row gap1 items-center justify-center" w-full @click="toggleDurationSortType">
            Duration
            <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center">
              <i text-xs :class="[durationSortType !== 'asc' ? 'i-carbon-arrow-down' : 'i-carbon-arrow-up', durationSortType ? 'op100 text-primary' : 'op50']" />
            </span>
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in filtered" :key="item.id" border="b dashed transparent hover:base">
        <td w32 ws-nowrap text-center text-sm op25>
          {{ item.type }}
        </td>
        <td w160 ws-nowrap text-left text-ellipsi line-clamp-1>
          <DisplayModuleId
            :id="item.module"
            w-full border-none
            :session="session"
            :link="`/session/${session.id}/graph?module=${item.module}`"
            hover="bg-active"
            border="~ base rounded" block px2 py1
          />
        </td>
        <td text-center text-sm>
          <DisplayDuration :duration="item.duration" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
