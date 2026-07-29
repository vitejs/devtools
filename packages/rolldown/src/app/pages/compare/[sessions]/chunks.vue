<script setup lang="ts">
import type {
  SessionCompareContext,
  SessionCompareDetails,
} from '~~/shared/types'

interface CompareTabItem {
  id: string
  label: string
  icon: string
}
type NormalizedSessionCompareContext = SessionCompareContext & { createdAt: Date, title: string }

defineProps<{
  tabs: CompareTabItem[]
  sessions: NormalizedSessionCompareContext[]
  details: SessionCompareDetails | null
}>()
</script>

<template>
  <CompareTabView
    tab="chunks"
    :tabs="tabs"
    :sessions="sessions"
    :details="details"
  />
</template>
