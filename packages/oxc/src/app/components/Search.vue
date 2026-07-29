<script setup lang="ts">
interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const search = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

function clearSearch() {
  search.value = ''
}
</script>

<template>
  <div class="w-full flex items-center gap-2 border border-base rounded-lg bg-base px3 py2">
    <div class="i-lucide-search op-fade flex-none" />
    <input
      v-model="search"
      class="w-full bg-transparent outline-none"
      placeholder="Search file names"
    />
    <button
      v-if="search?.length"
      class="i-lucide-circle-x op50 flex-none cursor-pointer hover:op100"
      aria-label="Clear input"
      @click="clearSearch"
    />
  </div>
</template>
