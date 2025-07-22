<script setup lang="ts">
import type { FilterMatchRule } from '~/utils/icon'
import { useVModel } from '@vueuse/core'
import { withDefaults } from 'vue'

interface ModelValue { search: string, selected: string[] | null }

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
</script>

<template>
  <div flex="col gap-2" max-w-90vw min-w-30vw border="~ base rounded-xl" bg-glass>
    <div border="b base">
      <input
        v-model="model.search"
        p2 px4
        w-full
        style="outline: none"
        placeholder="Search"
      >
    </div>
    <div flex="~ gap-2 wrap" p2>
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
    </div>
    <slot />
  </div>
</template>
