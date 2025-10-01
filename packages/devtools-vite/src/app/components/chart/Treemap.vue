<script setup lang="ts" generic="T, N">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps<{
  graph: GraphBase<T | undefined, GraphBaseOptions<T | undefined>>
  selected?: N | undefined
}>()

const emit = defineEmits<{
  (e: 'select', node: N | null): void
}>()

const el = useTemplateRef<HTMLDivElement>('el')
watchEffect(() => el.value?.append(props.graph.el))
</script>

<template>
  <div class="px4" flex="~ col gap2">
    <slot
      :selected="selected"
      :options="graph.options"
      @select="(node: N | null) => emit('select', node)"
    >
      <div border="b base" py2 min-h-10 />
    </slot>
    <div ref="el" />
  </div>
</template>
