<script setup lang="ts">
const props = defineProps<{
  lines?: {
    top?: boolean | number
    bottom?: boolean | number
  }
  classNodeInline?: string
  classNodeOuter?: string
  classNodeInner?: string
  classLineTop?: string
  classLineBottom?: string
  active?: boolean
}>()

const expanded = defineModel<boolean>('expanded', { required: false, default: true })
</script>

<template>
  <div class="flex flex-col relative">
    <div
      v-if="props.lines?.top" class="absolute top-0 left-10 border-r h-1/2 max-h-4 z-flowmap-line"
      :class="[active ? 'border-flow-line-active' : 'border-flow-line', props.classLineTop]"
      :style="typeof props.lines?.top === 'number' ? `height: ${props.lines.top}px` : ''"
    />
    <div
      v-if="props.lines?.bottom" class="absolute bottom-0 left-10 border-r h-1/2 max-h-4 z-flowmap-line"
      :class="[active ? 'border-flow-line-active' : 'border-flow-line', props.classLineBottom]"
      :style="typeof props.lines?.bottom === 'number' ? `height: ${props.lines.bottom}px` : ''"
    />
    <slot name="before" />
    <div :class="props.classNodeInline" class="flowmap-node-inline flex w-max">
      <slot name="inline-before" />
      <div
        :class="[
          props.classNodeOuter,
          active ? 'border-flow-active' : 'border-flow',
        ]"
        class="border rounded-2xl bg-base of-hidden cursor-pointer"
        @click="expanded = !expanded"
      >
        <slot name="inner">
          <div class="px3 py1 flex flex-inline gap-2 items-center" :class="props.classNodeInner">
            <slot name="content" />
          </div>
        </slot>
      </div>
      <slot name="inline-after" />
    </div>
    <slot name="after" />
  </div>
</template>
