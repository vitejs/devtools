<script setup lang="ts">
import type CodeMirror from 'codemirror'
import { onMounted, toRefs, useTemplateRef, watchEffect } from 'vue'
import { useCodeMirror } from '~/composables/codemirror'
import { settings } from '~/state/settings'

const props = defineProps<{
  code: string
}
>()

const { code } = toRefs(props)

let cm: CodeMirror.Editor

const codeEl = useTemplateRef('codeEl')

onMounted(() => {
  cm = useCodeMirror(
    codeEl,
    code,
    {
      mode: 'javascript',
      readOnly: true,
      lineNumbers: true,
    },
  )
  watchEffect(() => {
    cm.setOption('lineWrapping', settings.value.codeviewerLineWrap)
  })
})
</script>

<template>
  <div ref="codeEl" />
</template>
