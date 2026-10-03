<script setup lang="ts">
import { useVModel } from '@vueuse/core'

export interface FilterMatchRule {
  match: RegExp
  name: string
  description?: string
  icon: string
}

interface ModelValue {
  search?: string | false
  selected?: string[] | null
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    rules: FilterMatchRule[]
    modelValue?: ModelValue
    selectedContainerClass?: string
  }>(),
  {
    modelValue: () => ({
      search: '',
      selected: null,
    }),
    selectedContainerClass: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
}>()

const model = useVModel(props, 'modelValue', emit)

function isRuleSelected(rule: FilterMatchRule) {
  const { modelValue } = props
  if (!modelValue?.selected)
    return true
  return modelValue.selected.includes(rule.name)
}

function toggleRule(rule: FilterMatchRule) {
  const { rules } = props
  if (!model?.value?.selected)
    model.value.selected = rules.map(r => r.name)
  if (model.value.selected.includes(rule.name)) {
    model.value.selected = model.value.selected.filter(t => t !== rule.name)
  }
  else {
    model.value.selected.push(rule.name)
  }
  if (model?.value?.selected.length === props.rules.length)
    model.value.selected = null
}

function reverseSelect() {
  if (model?.value?.selected?.length === props.rules.length) {
    model.value.selected = null
  }
  else if (model?.value?.selected == null) {
    model.value.selected = []
  }
  else {
    model.value.selected = props.rules.map(r => r.name).filter(r => !model.value.selected?.includes(r))
  }
}

function unselectToggle() {
  if (model?.value?.selected?.length === 0)
    model.value.selected = null
  else
    model.value.selected = []
}
</script>

<template>
  <div class="flex-col gap-2 min-w-30vw border border-base rounded-xl bg-glass">
    <slot name="search">
      <div v-if="modelValue.search !== false" class="flex items-center">
        <input
          v-model="model.search"
          class="p2 px4 w-full"
          style="outline: none"
          placeholder="Search"
        >
        <slot name="search-end" />
      </div>
    </slot>
    <div v-if="rules.length" :class="selectedContainerClass" class="flex gap-2 flex-wrap p2 border-t border-base">
      <label
        v-for="rule of rules"
        :key="rule.name"
        class="border border-base rounded-md px2 py1 flex items-center gap-1 select-none"
        :title="rule.description"
        :class="isRuleSelected(rule) ? 'bg-active' : 'grayscale op50'"
      >
        <input
          type="checkbox"
          class="mr1"
          :checked="isRuleSelected(rule)"
          @change="toggleRule(rule)"
        >
        <div :class="rule.icon" class="icon-catppuccin" />
        <div class="text-sm">
          {{ rule.description || rule.name }}
        </div>
      </label>
      <button
        class="rounded-md p1 flex items-center gap-1 select-none hover:bg-active"
        title="Reverse Selection"
        @click="reverseSelect"
      >
        <div class="op75 i-ph-selection-background-duotone" />
      </button>
      <button
        class="rounded-md p1 flex items-center gap-1 select-none hover:bg-active"
        :title="model.selected?.length === 0 ? 'Select All' : 'Unselect All'"
        @click="unselectToggle"
      >
        <div v-if="model.selected?.length === 0" class="op75 i-ph-selection-slash-duotone" />
        <div v-else class="op75 i-ph-selection-plus-duotone" />
      </button>
    </div>
    <slot />
  </div>
</template>
