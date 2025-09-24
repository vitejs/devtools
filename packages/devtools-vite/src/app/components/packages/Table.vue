<script setup lang="ts">
import type { PackageInfo } from '~~/shared/types'
import { ref } from 'vue'

defineProps<{
  packages: PackageInfo[]
}>()
const sizeSortType = ref<string>('')
</script>

<template>
  <div role="table" min-w-max border="~ base rounded">
    <div role="row" class="border-b border-base" flex="~ row">
      <div role="columnheader" rounded-tl-2 bg-base flex-none min-w80 ws-nowrap py1.5 px2 font-600>
        Package
      </div>
      <div role="columnheader" rounded-tr-2 bg-base flex-none min-w50 ws-nowrap text-center py1.5 px2 font-600>
        Version
      </div>
      <div role="columnheader" rounded-tr-2 bg-base flex-none ws-nowrap py1.5 pl2 text-center font-600 min-w50>
        <button flex="~ row gap1 items-center justify-center" w-full relative>
          Size
          <span w-6 h-6 rounded-full cursor-pointer hover="bg-active" flex="~ items-center justify-center" right-0 top-0>
            <i text-xs :class="[sizeSortType !== 'asc' ? 'i-carbon-arrow-down' : 'i-carbon-arrow-up', sizeSortType ? 'op100 text-primary' : 'op50']" />
          </span>
        </button>
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
          <div role="cell" flex="~ items-center" flex-none min-w80 py1.5 px2 ws-nowrap text-sm op80>
            <DisplayHighlightedPackageName :name="item.name" />
          </div>
          <div role="cell" flex="~ items-center justify-center" flex-none font-mono py1.5 px2 text-sm min-w50 op80>
            {{ item.version }}
          </div>
          <div role="cell" flex="~ items-center justify-center" flex-none font-mono py1.5 px2 text-sm min-w50 op80>
            <template v-if="item.transformedCodeSize">
              <DisplayFileSizeBadge :bytes="item.transformedCodeSize" />
            </template>
            <span v-else op50>0</span>
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
