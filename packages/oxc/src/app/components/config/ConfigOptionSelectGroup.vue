<script setup lang="ts">
defineProps<{
  options: readonly string[]
  titles?: readonly string[]
  classes?: readonly string[]
}>()

const value = defineModel<string>({ required: true })
</script>

<template>
  <fieldset class="inline-flex flex-wrap gap-1 of-hidden text-sm">
    <label
      v-for="(option, index) in options"
      :key="option"
      class="relative cursor-pointer border border-base rounded-full px2.5 py0.5 hover:bg-active"
      :class="option === value ? 'bg-active' : 'saturate-0 hover:saturate-100'"
    >
      <span
        :class="[
          option === value ? '' : 'op50',
          titles?.[index] ? '' : 'capitalize',
          classes?.[index] ?? '',
        ]"
      >
        <slot :value="option" :title="titles?.[index]">
          {{ titles?.[index] ?? option }}
        </slot>
      </span>
      <input
        v-model="value"
        type="radio"
        :value="option"
        class="absolute inset-0 cursor-pointer op0"
      />
    </label>
  </fieldset>
</template>
