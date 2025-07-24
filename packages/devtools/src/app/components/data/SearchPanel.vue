<script setup lang="ts">
import type { FilterMatchRule } from '~/utils/icon'
import { useVModel } from '@vueuse/core'
import { withDefaults } from 'vue'

interface ModelValue { search: string, selected?: string[] | null }

const props = withDefaults(
  defineProps<{
    rules: FilterMatchRule[]
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

const model = useVModel(props, 'modelValue', emit)

function isRuleSelected(rule: FilterMatchRule) {
  const { modelValue } = props
  if (!modelValue?.selected)
    return true
  return modelValue.selected.includes(rule.name)
}

function toggleRule(rule: FilterMatchRule) {
  const { rules } = props
  if (!model?.value?.selected) {
    model.value.selected = rules.map(r => r.name)
  }
  if (model.value.selected.includes(rule.name)) {
    model.value.selected = model.value.selected.filter(t => t !== rule.name)
  }
  else {
    model.value.selected.push(rule.name)
  }
  if (model?.value?.selected.length === props.rules.length) {
    model.value.selected = null
  }
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
  if (model?.value?.selected?.length === 0) {
    model.value.selected = null
  }
  else {
    model.value.selected = []
  }
}
</script>

<template>
  <div flex="col gap-2" max-w-90vw min-w-30vw border="~ base rounded-xl" bg-glass>
    <div>
      <input
        v-model="model.search"
        p2 px4
        w-full
        style="outline: none"
        placeholder="Search"
      >
    </div>
    <div v-if="rules.length" flex="~ gap-2 wrap" p2 border="t base">
      <label
        v-for="rule of rules"
        :key="rule.name"
        border="~ base rounded-md" px2 py1
        flex="~ items-center gap-1"
        select-none
        :title="rule.description"
        :class="isRuleSelected(rule) ? 'bg-active' : 'grayscale op50'"
      >
        <input
          type="checkbox"
          mr1
          :checked="isRuleSelected(rule)"
          @change="toggleRule(rule)"
        >
        <div :class="rule.icon" icon-catppuccin />
        <div text-sm>{{ rule.description || rule.name }}</div>
      </label>
      <button
        rounded-md px2 py1
        flex="~ items-center gap-1"
        select-none
        hover="bg-active"
        @click="reverseSelect"
      >
        <div text-xs op50>
          Reverse
        </div>
      </button>
      <button
        rounded-md px2 py1
        flex="~ items-center gap-1"
        select-none
        hover="bg-active"
        @click="unselectToggle"
      >
        <div text-xs op50>
          {{ model.selected?.length === 0 ? 'Select All' : 'Unselect All' }}
        </div>
      </button>
    </div>
    <slot />
  </div>
</template>
