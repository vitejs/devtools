<script setup lang="ts">
const props = defineProps<{
  lines?: {
    top?: boolean | number
    bottom?: boolean | number
  }
  classNodeInline?: string
  classNodeOuter?: string
  classNodeInner?: string
  active?: boolean
}>()

const expanded = defineModel<boolean>('expanded', { required: false, default: true })
</script>

<template>
  <div flex="~ col" relative>
    <div
      v-if="props.lines?.top" absolute top-0 left-10 border="r" h="1/2" max-h-4 z-flowmap-line
      :class="active ? 'border-flow-line-active' : 'border-flow-line'"
      :style="typeof props.lines?.top === 'number' ? `height: ${props.lines.top}px` : ''"
    />
    <div
      v-if="props.lines?.bottom" absolute bottom-0 left-10 border="r" h="1/2" max-h-4 z-flowmap-line
      :class="active ? 'border-flow-line-active' : 'border-flow-line'"
      :style="typeof props.lines?.bottom === 'number' ? `height: ${props.lines.bottom}px` : ''"
    />
    <slot name="before" />
    <div flex="~" w-max :class="props.classNodeInline" class="flowmap-node-inline">
      <slot name="inline-before" />
      <div
        :class="[
          props.classNodeOuter,
          active ? 'border-flow-active' : 'border-flow',
        ]"
        border="~ rounded-2xl" bg-base of-hidden cursor-pointer
        @click="expanded = !expanded"
      >
        <slot name="inner">
          <div px3 py1 :class="props.classNodeInner" flex="~ inline gap-2 items-center">
            <slot name="content" />
          </div>
        </slot>
      </div>
      <slot name="inline-after" />
    </div>
    <slot name="after" />
  </div>
</template>
