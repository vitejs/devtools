<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { withDefaults } from 'vue'

interface FilterType { label: string, value: string, icon: string }

interface ModelValue { search: string, selected: string[] | null }

const props = withDefaults(
  defineProps<{
    filterTypes: FilterType[]
    modelValue?: ModelValue
  }>(),
  {
    modelValue: () => ({
      search: '',
      selected: null,
    }),
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
}>()

const Model = useVModel(props, 'modelValue', emit)

function isFilterTypeSelected(type: string) {
  const { modelValue } = props
  if (!modelValue?.selected)
    return true
  return modelValue.selected.includes(type)
}

function toggleFilterType(type: string) {
  const { filterTypes } = props
  if (!Model?.value?.selected) {
    Model.value.selected = filterTypes.map(t => t.value)
  }
  if (Model.value.selected.includes(type)) {
    Model.value.selected = Model.value.selected.filter(t => t !== type)
  }
  else {
    Model.value.selected.push(type)
  }
  if (Model?.value?.selected.length === props.filterTypes.length) {
    Model.value.selected = null
  }
}
</script>

<template>
  <div flex="col gap-2" max-w-90vw border="~ base rounded-xl" bg-glass>
    <div border="b base">
      <input
        v-model="Model.search"
        p2 px4
        w-full
        style="outline: none"
        placeholder="Search"
      >
    </div>
    <div flex="~ gap-2 wrap" p2>
      <label
        v-for="type of filterTypes"
        :key="type.value"
        border="~ base rounded-md" px2 py1
        flex="~ items-center gap-1"
        select-none
        :title="type.label"
        :class="isFilterTypeSelected(type.value) ? 'bg-active' : 'grayscale op50'"
      >
        <input
          type="checkbox"
          mr1
          :checked="isFilterTypeSelected(type.value)"
          @change="toggleFilterType(type.value)"
        >
        <div :class="type.icon" icon-catppuccin />
        <div text-sm>{{ type.label }}</div>
      </label>
    </div>
    <slot />
  </div>
</template>
