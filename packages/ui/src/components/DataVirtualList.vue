<script setup lang="ts" generic="T">
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/index.css'

withDefaults(defineProps<{
  items: T[]
  keyProp: keyof T & string
  pageMode?: boolean
  minItemSize?: number
}>(), {
  pageMode: true,
  minItemSize: 30,
})

defineSlots<{
  before?: () => void
  default: (props: {
    item: T
    index: number
    active?: boolean
  }) => void
}>()
</script>

<template>
  <DynamicScroller
    :items="items"
    :min-item-size="minItemSize"
    :key-field="keyProp"
    :page-mode="pageMode"
  >
    <template #before>
      <slot name="before" />
    </template>
    <template #default="{ item, active, index }">
      <DynamicScrollerItem
        :item="(item as T)"
        :active="active"
        :index="index"
      >
        <slot
          v-bind="{ key: (item as T)[keyProp] }"
          :item="(item as T)"
          :index="index"
          :active="active"
        />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>
