<script setup lang="ts" generic="T">
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
    :key-field="(keyProp as string)"
    page-mode
  >
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
  </DynamicScroller>
</template>
