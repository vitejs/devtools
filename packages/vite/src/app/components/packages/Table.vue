<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { settings } from '~~/app/state/settings'

withDefaults(defineProps<{
  packages: PackageInfo[]
  session: SessionContext
  disableSizeSort?: boolean
  groupView?: boolean
}>(), {
  disableSizeSort: false,
  groupView: false,
})

const { state: sizeSortType, next } = useCycleList(['', 'desc', 'asc'], {
  initialValue: settings.value.packageSizeSortType,
})

function toggleSizeSortType() {
  next()
  settings.value.packageSizeSortType = sizeSortType.value
}
</script>

<template>
  <div role="table" min-w-max border="~ base rounded-xl">
    <div role="row" class="border-b border-base" flex="~ row">
      <div :title="groupView ? 'Package' : 'Bundled packages'" role="columnheader" rounded-tl-2 flex-none ws-nowrap py1.5 px2 font-600 :class="[groupView ? 'min-w40' : 'min-w80']">
        <template v-if="groupView">
          <div font-mono>
            <DisplayHighlightedPackageName :name="packages?.[0]?.name!" />
          </div>
        </template>
        <template v-else>
          Package
        </template>
      </div>
      <div v-if="!groupView" title="Package version" role="columnheader" rounded-tr-2 flex-none min-w40 ws-nowrap text-left py1.5 px2 font-600>
        Version
      </div>
      <div title="Transformed code size" role="columnheader" rounded-tr-2 flex-none ws-nowrap py1.5 pl2 font-600 min-w40>
        <button flex="~ row gap1 items-center justify-end" w-full relative pr2>
          Size
          <span v-if="!disableSizeSort" w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center" @click="toggleSizeSortType">
            <i text-xs :class="[sizeSortType !== 'asc' ? 'i-ph-arrow-down-duotone' : 'i-ph-arrow-up-duotone', sizeSortType ? 'op100 text-primary' : 'op50']" />
          </span>
        </button>
      </div>
      <div title="Importers" role="columnheader" rounded-tr-2 flex-none ws-nowrap py1.5 pl20 pr2 font-600 min-w50>
        Importers
      </div>
    </div>

    <DataVirtualList
      v-if="packages.length"
      role="rowgroup"
      :items="packages"
      key-prop="dir"
    >
      <template #default="{ item, index }">
        <div
          role="row"
          flex="~ row"
          class="border-base border-b-1 border-dashed"
          :class="[index === packages.length - 1 ? 'border-b-0' : '']"
        >
          <div v-if="!groupView" role="cell" font-mono flex-none min-w80 py1.5 px2 ws-nowrap text-sm>
            <DisplayHighlightedPackageName :name="item.name" />
          </div>
          <div role="cell" flex="~ items-center" text-left flex-none font-mono py1.5 px2 text-sm min-w40 op80 :class="{ 'text-primary': item.duplicated }">
            {{ item.version }}
          </div>
          <div role="cell" flex="~ items-center justify-end" flex-none font-mono py1.5 px2 text-sm min-w40 op80>
            <VMenu :delay="{ show: 200, hide: 0 }">
              <DisplayFileSizeBadge :bytes="item.transformedCodeSize" />
              <template #popper>
                <div p2 flex="~ col gap-1">
                  <div v-for="file of item.files.filter(f => !!f.transformedCodeSize)" :key="file.path" flex="~ row gap-1 items-center nowrap" w-max>
                    <span w24 inline-flex>
                      <DisplayFileSizeBadge :bytes="file.transformedCodeSize" />
                    </span>
                    <DisplayModuleId :id="file.path" :session="session" ws-nowrap flex-1 disable-tooltip link />
                  </div>
                </div>
              </template>
            </VMenu>
          </div>
          <div role="cell" flex="~ items-center" flex-1 font-mono py1.5 pl20 pr2 text-sm op80>
            <PackagesImporters :package="item" :session="session" :show-version="groupView" />
          </div>
        </div>
      </template>
    </DataVirtualList>
    <div v-else>
      <div p4>
        <div w-full h-48 flex="~ items-center justify-center" op50 italic>
          <p>
            No data
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
