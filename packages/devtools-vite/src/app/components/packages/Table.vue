<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types'
import { useCycleList } from '@vueuse/core'
import { Menu as VMenu } from 'floating-vue'
import { settings } from '~~/app/state/settings'

defineProps<{
  packages: PackageInfo[]
  session: SessionContext
}>()

const { state: sizeSortType, next } = useCycleList(['', 'desc', 'asc'], {
  initialValue: settings.value.packageSizeSortType,
})

function toggleSizeSortType() {
  next()
  settings.value.packageSizeSortType = sizeSortType.value
}
</script>

<template>
  <div role="table" min-w-max border="~ base rounded">
    <div role="row" class="border-b border-base" flex="~ row">
      <div title="Bundled packages" role="columnheader" rounded-tl-2 bg-base flex-none min-w80 ws-nowrap py1.5 px2 font-600>
        Package
      </div>
      <div title="Package version" role="columnheader" rounded-tr-2 bg-base flex-none min-w50 ws-nowrap text-center py1.5 px2 font-600>
        Version
      </div>
      <div title="Transformed code size" role="columnheader" rounded-tr-2 bg-base flex-none ws-nowrap py1.5 pl2 text-center font-600 min-w50>
        <button flex="~ row gap1 items-center justify-center" w-full relative>
          Size
          <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center" right-0 top-0 @click="toggleSizeSortType">
            <i text-xs :class="[sizeSortType !== 'asc' ? 'i-carbon-arrow-down' : 'i-carbon-arrow-up', sizeSortType ? 'op100 text-primary' : 'op50']" />
          </span>
        </button>
      </div>
      <div title="Importers" role="columnheader" rounded-tr-2 bg-base flex-none ws-nowrap py1.5 pl2 font-600 min-w50>
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
          <div role="cell" flex="~ items-center gap1" flex-none min-w80 py1.5 px2 ws-nowrap text-sm>
            {{ item.name }}
            <i v-if="item.duplicated" text-xs op50 i-tabler:packages title="Duplicate package" />
          </div>
          <div role="cell" flex="~ items-center justify-center" flex-none font-mono py1.5 px2 text-sm min-w50 op80>
            {{ item.version }}
          </div>
          <div role="cell" flex="~ items-center justify-center" flex-none font-mono py1.5 px2 text-sm min-w50 op80>
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
          <div role="cell" flex="~ items-center" flex-1 font-mono py1.5 px2 text-sm op80>
            <PackagesImporters :package="item" :session="session" />
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
