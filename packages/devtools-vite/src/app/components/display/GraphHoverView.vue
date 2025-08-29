<script setup lang="ts">
import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { ref, toRefs, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  hoverX: number
  hoverY: number
}>()

const { hoverX, hoverY } = toRefs(props)

const hoverElement = useTemplateRef<HTMLElement>('hoverElement')

const left = ref(0)
const top = ref(0)

watch([hoverX, hoverY], ([x, y]) => {
  const virtualEl = {
    getBoundingClientRect() {
      return {
        width: 0,
        height: 0,
        x: x!,
        y: y!,
        left: x!,
        right: x!,
        top: y!,
        bottom: y!,
      }
    },
  }

  computePosition(virtualEl, hoverElement.value!, {
    placement: 'bottom-start',
    middleware: [flip(), shift(), offset(10)],
  }).then(({ x, y }) => {
    left.value = x
    top.value = y
  })
})
</script>

<template>
  <Teleport to="body">
    <div ref="hoverElement" fixed z-panel-content :style="{ left: `${left}px`, top: `${top}px` }">
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>

</style>
