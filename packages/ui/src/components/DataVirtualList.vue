<script setup lang="ts" generic="T">
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

withDefaults(defineProps<{
  items: T[]
  keyProp: keyof T
  pageMode?: boolean
}>(), {
  pageMode: true,
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
    :min-item-size="30"
    :key-field="(keyProp as string)"
    :page-mode="pageMode"
  >
    <template #before>
      <slot name="before" />
    </template>
    <template #default="{ item, active, index }">
      <DynamicScrollerItem
        :item="(item as T)"
        :active="active"
        :data-index="index"
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
