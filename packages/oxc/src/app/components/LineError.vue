<script setup lang="ts">
import type { Label, LineData } from '../../../src/types'
import { Tooltip as VTooltip } from 'floating-vue'
import { calculateErrorHeight, getFileExt, processLabelHtml } from '~/composables/useFileUtils'

interface Props {
  lineData: LineData
  filename: string
  source: string
}

const props = defineProps<Props>()

// Compute the code for the current line
const currentLineCode = computed(() => {
  const lines = props.source.split('\n')
  return lines[props.lineData.line - 1] || ''
})

// Get the file extension
const fileExt = computed(() => getFileExt(props.filename))

// Compute the error marker height
const errorHeight = computed(() => calculateErrorHeight(props.lineData.messages))

// Get the sorted labels
const sortedLabels = computed(() => {
  return props.lineData.messages
    .flatMap(m => m.labels || [])
    .sort((a, b) => a.span.column - b.span.column)
})

// Get the message associated with a label
function getMessageForLabel(column: number) {
  for (const message of props.lineData.messages) {
    if (message.labels) {
      for (const label of message.labels) {
        if (label.span.column === column) {
          return message
        }
      }
    }
  }
  return null
}

// Compute the label's vertical position style
function getLabelVerticalStyle(labelIndex: number, baseLeft = 0) {
  const label = sortedLabels.value[labelIndex]
  if (!label) {
    return { left: '0ch' }
  }

  return {
    left: `calc(${Math.floor((label.span.length - 1) / 2) + baseLeft}ch)`,
  }
}

// Generate the label indicator
function generateLabelIndicator(label: Label) {
  const preDashes = Math.floor((label.span.length - 1) / 2)
  const postDashes = Math.ceil((label.span.length - 1) / 2)

  return {
    preDashes: Array.from({ length: preDashes }, (_, i) => i),
    postDashes: Array.from({ length: postDashes }, (_, i) => i),
  }
}

function severityClass(severity: string | undefined) {
  if (severity === 'error') {
    return 'text-red-300 group-hover:text-red-600 dark:text-red-800 dark:group-hover:text-red-500'
  }

  return 'text-yellow-400 group-hover:text-yellow-600 dark:text-yellow-800 dark:group-hover:text-yellow-300'
}
</script>

<template>
  <div overflow-auto>
    <div p4>
      <!-- Current line code -->
      <div flex gap-4 items-start>
        <span op-fade font-mono text-sm relative top-3px>{{ lineData.line }}</span>
        <div flex-1>
          <Shiki :code="currentLineCode" :ext="fileExt" />

          <div flex relative :style="{ minHeight: `${errorHeight}px`, top: '-10px' }">
            <a
              v-for="(label, labelIndex) in sortedLabels"
              :key="labelIndex"
              target="_blank"
              :href="getMessageForLabel(label.span.column)?.url"
              absolute
              whitespace-pre
              text-neutral-300
              dark:text-neutral-600
              hover:text-neutral-800
              dark:hover:text-neutral-200
              cursor-pointer
              group
              :style="{ left: `calc(${label.span.column - 1}ch)` }"
            >
              <VTooltip :delay="{ show: 100, hide: 200 }" :popper-triggers="['hover']">
                <div>
                  <div>
                    <span v-for="i in generateLabelIndicator(label).preDashes" :key="`pre-${i}`"
                      >─</span
                    >
                    <span>┬</span>
                    <span v-for="i in generateLabelIndicator(label).postDashes" :key="`post-${i}`"
                      >─</span
                    >
                  </div>
                  <div
                    v-for="i in (sortedLabels.length - labelIndex - 1) * 2"
                    :key="`bar-${i}`"
                    relative
                    :style="getLabelVerticalStyle(labelIndex, -1)"
                  >
                    │
                  </div>
                  <div relative flex :style="getLabelVerticalStyle(labelIndex)">
                    <div>╰─</div>
                    <div
                      v-if="(label as any).label"
                      ml1
                      v-html="`${processLabelHtml((label as any).label)}.`"
                    />
                    <div
                      ml1
                      :class="severityClass(getMessageForLabel(label.span.column)?.severity)"
                    >
                      {{ getMessageForLabel(label.span.column)?.code }}
                    </div>
                  </div>
                </div>
                <template #popper>
                  <div max-w-sm>
                    <ErrorTooltip
                      v-if="getMessageForLabel(label.span.column)"
                      :message="getMessageForLabel(label.span.column)!"
                      :filename="filename"
                      :line="lineData.line"
                      :column="label.span.column"
                    />
                  </div>
                </template>
              </VTooltip>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
