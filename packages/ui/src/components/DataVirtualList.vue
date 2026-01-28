<script setup lang="ts" generic="T">
// @ts-expect-error missing types
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

defineProps<{
  items: T[]
  keyProp: keyof T
}>()

defineSlots<{
  default: (props: {
    item: T
    index: number
    active?: boolean
  }) => void
}>()
</script>

<template>
  <DynamicScroller
    v-slot="{ item, active, index }"
    :items="items"
    :min-item-size="30"
    :key-field="keyProp"
    page-mode
  >
    <DynamicScrollerItem
      :item="item"
      :active="active"
      :data-index="index"
    >
      <slot v-bind="{ key: item[keyProp] }" :item="item" :index="index" :active="active" />
    </DynamicScrollerItem>
  </DynamicScroller>
</template>
