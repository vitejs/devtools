<script setup lang="ts" generic="T">
import { DynamicScroller, DynamicScrollerItem, RecycleScroller, WindowScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/index.css'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  items: T[]
  keyProp: keyof T & string
  pageMode?: boolean
  minItemSize?: number
  itemSize?: number
  scroller?: 'dynamic' | 'fixed' | 'window'
}>(), {
  pageMode: true,
  minItemSize: 30,
  scroller: 'dynamic',
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
  <div
    v-if="props.scroller === 'window'"
    v-bind="$attrs"
    class="data-virtual-list-window"
  >
    <WindowScroller
      class="data-virtual-list-window__scroller"
      list-class="data-virtual-list-window__list"
      item-class="data-virtual-list-window__item"
      :items="props.items"
      :item-size="props.itemSize ?? null"
      :min-item-size="props.minItemSize"
      :key-field="props.keyProp"
      :flow-mode="props.itemSize == null"
    >
      <template #before>
        <slot name="before" />
      </template>
      <template #default="{ item, active, index }">
        <slot
          v-bind="{ key: (item as T)[props.keyProp] }"
          :item="(item as T)"
          :index="index"
          :active="active"
        />
      </template>
    </WindowScroller>
  </div>
  <DynamicScroller
    v-else-if="props.scroller === 'dynamic'"
    v-bind="$attrs"
    :items="props.items"
    :min-item-size="props.minItemSize"
    :key-field="props.keyProp"
    :page-mode="props.pageMode"
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
          v-bind="{ key: (item as T)[props.keyProp] }"
          :item="(item as T)"
          :index="index"
          :active="active"
        />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
  <RecycleScroller
    v-else
    v-bind="$attrs"
    :items="props.items"
    :item-size="props.itemSize ?? props.minItemSize"
    :key-field="props.keyProp"
    :page-mode="props.pageMode"
  >
    <template #before>
      <slot name="before" />
    </template>
    <template #default="{ item, active, index }">
      <slot
        v-bind="{ key: (item as T)[props.keyProp] }"
        :item="(item as T)"
        :index="index"
        :active="active"
      />
    </template>
  </RecycleScroller>
</template>
