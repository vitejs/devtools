<script setup lang="ts">
import { computePosition, flip, shift } from '@floating-ui/dom'
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
    placement: 'right-start',
    middleware: [flip(), shift()],
  }).then(({ x, y }) => {
    left.value = x
    top.value = y
  })
})
</script>

<template>
  <Teleport to="body">
    <div ref="hoverElement" fixed z-panel-content :style="{ left: `${left + 10}px`, top: `${top + 10}px` }">
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>

</style>
