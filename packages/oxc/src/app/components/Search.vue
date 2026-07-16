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
  <div class="w-full">
    <u-input v-model="search" size="lg" class="w-full" placeholder="Search file names">
      <template v-if="search?.length" #trailing>
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-circle-x"
          aria-label="Clear input"
          @click="clearSearch"
        />
      </template>
      <template #leading>
        <UIcon name="i-lucide-search" />
      </template>
    </u-input>
  </div>
</template>
