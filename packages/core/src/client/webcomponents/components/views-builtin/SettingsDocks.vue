<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import type { DevToolsDockEntriesGrouped, DevToolsDocksUserSettings } from '../../state/dock-settings'
import { useDraggable } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import { docksGroupByCategories, getCategoryLabel, getGroupMembers, getGroupMembersGrouped, isCategoryHideable } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import HashBadge from '../display/HashBadge.vue'
import DockIcon from '../dock/DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  settingsStore: SharedState<DevToolsDocksUserSettings>
}>()

const settings = sharedStateToRef(props.settingsStore)

// Top-level rows are grouped by category with members collapsed under their
// group button. A group's members are split by their in-group sub-category, and
// each sub-category is its own reorderable container (`grp:<id>:::<subcat>`);
// category containers are keyed `cat:<name>`.
const categories = computed<DevToolsDockEntriesGrouped>(() => {
  return docksGroupByCategories(props.context.docks.entries, settings.value, {
    includeHidden: true,
    collapseGroups: true,
  })
})

function membersOf(groupId: string): DevToolsDockEntry[] {
  return getGroupMembers(props.context.docks.entries, groupId, settings.value, {
    includeHidden: true,
  })
}

function subcategoriesOf(groupId: string): DevToolsDockEntriesGrouped {
  return getGroupMembersGrouped(props.context.docks.entries, groupId, settings.value, {
    includeHidden: true,
  })
}

const GROUP_SUBCAT_SEPARATOR = ':::'
const CATEGORY_CONTAINER = (category: string) => `cat:${category}`
const GROUP_SUBCAT_CONTAINER = (groupId: string, subcategory: string) => `grp:${groupId}${GROUP_SUBCAT_SEPARATOR}${subcategory}`

/** Split a `grp:<id>:::<subcat>` container back into its group id + sub-category. */
function parseGroupContainer(container: string): { groupId: string, subcategory: string } {
  const rest = container.slice(4)
  const at = rest.indexOf(GROUP_SUBCAT_SEPARATOR)
  return {
    groupId: rest.slice(0, at),
    subcategory: rest.slice(at + GROUP_SUBCAT_SEPARATOR.length),
  }
}

function itemsOfContainer(container: string): DevToolsDockEntry[] {
  if (container.startsWith('grp:')) {
    const { groupId, subcategory } = parseGroupContainer(container)
    return subcategoriesOf(groupId).find(([cat]) => cat === subcategory)?.[1] ?? []
  }
  const category = container.slice(4)
  return categories.value.find(([cat]) => cat === category)?.[1] ?? []
}

function defaultItemsOfContainer(container: string): DevToolsDockEntry[] {
  const noCustomOrder = { ...settings.value, docksCustomOrder: {} }
  if (container.startsWith('grp:')) {
    const { groupId, subcategory } = parseGroupContainer(container)
    return getGroupMembersGrouped(props.context.docks.entries, groupId, noCustomOrder, { includeHidden: true })
      .find(([cat]) => cat === subcategory)?.[1] ?? []
  }
  const category = container.slice(4)
  return docksGroupByCategories(props.context.docks.entries, noCustomOrder, { includeHidden: true, collapseGroups: true })
    .find(([cat]) => cat === category)?.[1] ?? []
}

const sortContainerEl = useTemplateRef<HTMLElement>('sortContainer')
const entryEls = new Map<string, { el: HTMLElement, container: string }>()
const draggingId = ref<string | null>(null)
const draggingContainer = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const hasMoved = ref(false)
let startY = 0
const DRAG_THRESHOLD = 4

function findEntryFromEvent(event: PointerEvent): { dockId: string | null, container: string | null } {
  let el = event.target as HTMLElement | null
  while (el && el !== sortContainerEl.value) {
    if (el.dataset.dockId)
      return { dockId: el.dataset.dockId, container: el.dataset.container ?? null }
    el = el.parentElement
  }
  return { dockId: null, container: null }
}

function isInteractiveElement(el: HTMLElement | null): boolean {
  while (el && el !== sortContainerEl.value) {
    if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT')
      return true
    el = el.parentElement
  }
  return false
}

function applyOrder(container: string, items: DevToolsDockEntry[]) {
  const def = defaultItemsOfContainer(container).map(i => i.id)
  const isDefault = items.length === def.length && items.every((item, i) => item.id === def[i])
  props.settingsStore.mutate((state) => {
    items.forEach((item, index) => {
      if (isDefault)
        delete state.docksCustomOrder[item.id]
      else
        state.docksCustomOrder[item.id] = index
    })
  })
}

useDraggable(sortContainerEl, {
  draggingElement: () => sortContainerEl.value?.ownerDocument?.defaultView ?? window,
  onStart(_, event) {
    if (event.button !== 0)
      return false
    if (isInteractiveElement(event.target as HTMLElement))
      return false
    const { dockId, container } = findEntryFromEvent(event)
    if (!dockId || !container)
      return false
    draggingId.value = dockId
    draggingContainer.value = container
    hasMoved.value = false
    startY = event.clientY
  },
  onMove(_, event) {
    if (!draggingId.value)
      return
    if (!hasMoved.value) {
      if (Math.abs(event.clientY - startY) < DRAG_THRESHOLD)
        return
      hasMoved.value = true
    }
    let target: string | null = null
    for (const [id, { el, container }] of entryEls) {
      if (id === draggingId.value)
        continue
      if (container !== draggingContainer.value)
        continue
      const rect = el.getBoundingClientRect()
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
        target = id
        break
      }
    }
    dragOverId.value = target
  },
  onEnd() {
    if (draggingId.value && hasMoved.value && dragOverId.value && draggingContainer.value) {
      const items = [...itemsOfContainer(draggingContainer.value)]
      const fromIndex = items.findIndex(item => item.id === draggingId.value)
      const toIndex = items.findIndex(item => item.id === dragOverId.value)
      if (fromIndex !== -1 && toIndex !== -1) {
        items.splice(toIndex, 0, items.splice(fromIndex, 1)[0]!)
        applyOrder(draggingContainer.value, items)
      }
    }
    draggingId.value = null
    draggingContainer.value = null
    dragOverId.value = null
    hasMoved.value = false
  },
})

function setEntryRef(el: any, dockId: string, container: string) {
  if (el)
    entryEls.set(dockId, { el: el as HTMLElement, container })
  else
    entryEls.delete(dockId)
}

function toggleDock(id: string, visible?: boolean) {
  if (id === '~settings')
    return
  const hidden = settings.value.docksHidden
  const isHidden = hidden.includes(id)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    props.settingsStore.mutate((state) => {
      state.docksHidden = state.docksHidden.filter((i: string) => i !== id)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksHidden = [...state.docksHidden, id]
    })
  }
}

function toggleCategory(category: string, visible?: boolean) {
  if (!isCategoryHideable(category))
    return
  const hidden = settings.value.docksCategoriesHidden
  const isHidden = hidden.includes(category)
  const shouldShow = visible ?? isHidden

  if (shouldShow) {
    props.settingsStore.mutate((state) => {
      state.docksCategoriesHidden = state.docksCategoriesHidden.filter((i: string) => i !== category)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksCategoriesHidden = [...state.docksCategoriesHidden, category]
    })
  }
}

function togglePin(id: string) {
  const pinned = settings.value.docksPinned
  if (pinned.includes(id)) {
    props.settingsStore.mutate((state) => {
      state.docksPinned = state.docksPinned.filter((i: string) => i !== id)
    })
  }
  else {
    props.settingsStore.mutate((state) => {
      state.docksPinned = [...state.docksPinned, id]
    })
  }
}

function moveOrder(container: string, id: string, delta: number) {
  const array = [...itemsOfContainer(container)]
  const index = array.findIndex(item => item.id === id)
  const newIndex = index + delta
  if (newIndex < 0 || newIndex >= array.length)
    return

  array.splice(newIndex, 0, array.splice(index, 1)[0]!)
  applyOrder(container, array)
}

function customOrderIdsForContainer(container: string): string[] {
  const items = itemsOfContainer(container)
  const ids = items.map(item => item.id)
  if (container.startsWith('cat:')) {
    // Resetting a category also clears the custom order of every member nested
    // in its groups (across all their sub-categories).
    for (const item of items) {
      if (item.type === 'group')
        ids.push(...membersOf(item.id).map(member => member.id))
    }
  }
  return ids
}

function doesContainerHaveCustomOrder(container: string): boolean {
  const current = itemsOfContainer(container).map(i => i.id)
  const def = defaultItemsOfContainer(container).map(i => i.id)
  if (current.length !== def.length || current.some((id, i) => id !== def[i]))
    return true
  // Also account for custom ordering inside each group's sub-categories
  if (container.startsWith('cat:')) {
    return itemsOfContainer(container).some(item =>
      item.type === 'group'
      && subcategoriesOf(item.id).some(([subcat]) =>
        doesContainerHaveCustomOrder(GROUP_SUBCAT_CONTAINER(item.id, subcat)),
      ),
    )
  }
  return false
}

function resetCustomOrderForContainer(container: string) {
  const ids = customOrderIdsForContainer(container)
  props.settingsStore.mutate((state) => {
    ids.forEach((id) => {
      delete state.docksCustomOrder[id]
    })
  })
}
</script>

<template>
  <p class="text-sm op50 mb-4">
    Manage visibility and order of dock entries. Hidden entries will not appear in the dock bar.
  </p>

  <div ref="sortContainer" class="flex flex-col gap-4">
    <template v-for="[category, entries] of categories" :key="category">
      <div
        class="border border-base rounded-lg overflow-hidden transition-opacity"
        :class="settings.docksCategoriesHidden.includes(category) ? 'op40' : ''"
      >
        <!-- Category header -->
        <div
          class="flex items-center gap-2 px-4 py-3 bg-gray/5 cursor-pointer select-none border-b border-base"
        >
          <button
            class="w-5 h-5 flex items-center justify-center rounded transition-colors"
            :class="[
              !isCategoryHideable(category) ? 'bg-gray/20 cursor-not-allowed op50' : settings.docksCategoriesHidden.includes(category) ? 'bg-gray/20' : 'bg-primary/20 text-primary',
            ]"
            :disabled="!isCategoryHideable(category)"
            @click="toggleCategory(category)"
          >
            <div
              class="transition-transform"
              :class="settings.docksCategoriesHidden.includes(category) ? 'i-ph-eye-slash text-sm op50' : 'i-ph-check-bold text-xs'"
            />
          </button>
          <span class="font-medium capitalize">{{ getCategoryLabel(category) }}</span>
          <span class="text-xs op40">({{ entries.length }})</span>
          <span class="flex-auto" />
          <button
            v-if="doesContainerHaveCustomOrder(CATEGORY_CONTAINER(category))"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
            title="Reset custom order"
            @click="resetCustomOrderForContainer(CATEGORY_CONTAINER(category))"
          >
            <div class="i-ph-arrows-counter-clockwise-duotone text-sm op60" />
          </button>
        </div>

        <!-- Entries -->
        <div>
          <template v-for="(dock, index) of entries" :key="dock.id">
            <!-- Row -->
            <div
              :ref="(el: any) => setEntryRef(el, dock.id, CATEGORY_CONTAINER(category))"
              :data-dock-id="dock.id"
              :data-container="CATEGORY_CONTAINER(category)"
              class="flex items-center gap-3 px-2 py-2.5 hover:bg-gray/5 transition-all group border-b border-base border-t-0"
              :class="[
                settings.docksHidden.includes(dock.id) ? 'op40' : '',
                hasMoved && draggingId === dock.id ? 'op30 bg-gray/10' : '',
                dragOverId === dock.id ? 'ring-1.5 ring-purple/50 rounded' : '',
                hasMoved ? 'select-none' : '',
              ]"
            >
              <!-- drag icon -->
              <div
                class="i-ph-dots-six-vertical w-4 h-4 shrink-0 op25 group-hover:op50 transition-opacity cursor-grab"
                :style="hasMoved && draggingId === dock.id ? 'cursor: grabbing' : ''"
              />

              <!-- Visibility toggle -->
              <button
                class="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-base transition-colors shrink-0"
                :class="dock.id === '~settings' ? 'cursor-not-allowed op50' : settings.docksHidden.includes(dock.id) ? 'op50' : ''"
                :disabled="dock.id === '~settings'"
                :title="dock.id === '~settings' ? 'Always visible' : settings.docksHidden.includes(dock.id) ? 'Show' : 'Hide'"
                @click="toggleDock(dock.id)"
              >
                <div
                  class="w-4 h-4 rounded flex items-center justify-center transition-colors"
                  :class="dock.id === '~settings' ? 'bg-gray/30' : settings.docksHidden.includes(dock.id) ? 'bg-gray/30' : 'bg-primary/20 text-primary'"
                >
                  <div
                    v-if="!settings.docksHidden.includes(dock.id)"
                    class="i-ph-check-bold text-xs"
                  />
                </div>
              </button>

              <!-- Icon & Title -->
              <DockIcon
                :icon="dock.icon"
                :title="dock.title"
                class="w-5 h-5 shrink-0"
                :class="settings.docksHidden.includes(dock.id) ? 'saturate-0' : ''"
              />
              <span
                class="truncate"
                :class="settings.docksHidden.includes(dock.id) ? 'line-through op60' : ''"
              >
                {{ dock.title }}
              </span>
              <HashBadge
                v-if="dock.type === 'action'"
                label="Action"
                class="flex-none text-xs"
              />
              <HashBadge
                v-else-if="dock.type === 'group'"
                label="Group"
                class="flex-none text-xs"
              />

              <div class="flex flex-auto" />

              <!-- Order controls -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="index > 0"
                  class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                  title="Move up (higher priority)"
                  @click="moveOrder(CATEGORY_CONTAINER(category), dock.id, -1)"
                >
                  <div class="i-ph-caret-up text-sm op60" />
                </button>
                <button
                  v-if="index < entries.length - 1"
                  class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                  title="Move down (lower priority)"
                  @click="moveOrder(CATEGORY_CONTAINER(category), dock.id, 1)"
                >
                  <div class="i-ph-caret-down text-sm op60" />
                </button>
              </div>

              <!-- Pin toggle -->
              <button
                class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/20 transition-colors shrink-0"
                :class="settings.docksPinned.includes(dock.id) ? 'text-amber' : 'op40 hover:op70'"
                :title="settings.docksPinned.includes(dock.id) ? 'Unpin' : 'Pin'"
                @click="togglePin(dock.id)"
              >
                <div
                  :class="settings.docksPinned.includes(dock.id) ? 'i-ph-push-pin-fill rotate--45' : 'i-ph-push-pin'"
                  class="text-base"
                />
              </button>
            </div>

            <!-- Nested group members -->
            <div
              v-if="dock.type === 'group'"
              class="flex"
              :class="settings.docksHidden.includes(dock.id) ? 'op50' : ''"
            >
              <div class="border-base border-r border-b w-6 flex-none" />
              <div class="bg-gray/3 flex flex-col w-full flex-auto">
                <div
                  v-if="membersOf(dock.id).length === 0"
                  class="px-2 py-2 text-xs op40 italic border-b border-base border-t-0"
                >
                  No tools in this group yet
                </div>
                <template v-for="[subcategory, members] of subcategoriesOf(dock.id)" :key="subcategory">
                  <!-- In-group sub-category header (shown only when the group spans multiple sub-categories) -->
                  <div
                    v-if="subcategoriesOf(dock.id).length > 1"
                    class="flex items-center gap-2 px-2 py-1.5 bg-gray/5 border-b border-base border-t-0"
                  >
                    <span class="text-xs uppercase tracking-wide op50">{{ getCategoryLabel(subcategory) }}</span>
                    <span class="flex-auto" />
                    <button
                      v-if="doesContainerHaveCustomOrder(GROUP_SUBCAT_CONTAINER(dock.id, subcategory))"
                      class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                      title="Reset custom order"
                      @click="resetCustomOrderForContainer(GROUP_SUBCAT_CONTAINER(dock.id, subcategory))"
                    >
                      <div class="i-ph-arrows-counter-clockwise-duotone text-xs op60" />
                    </button>
                  </div>
                  <div
                    v-for="(member, memberIndex) of members"
                    :key="member.id"
                    :ref="(el: any) => setEntryRef(el, member.id, GROUP_SUBCAT_CONTAINER(dock.id, subcategory))"
                    :data-dock-id="member.id"
                    :data-container="GROUP_SUBCAT_CONTAINER(dock.id, subcategory)"
                    class="flex items-center gap-3 px-2 py-2 hover:bg-gray/5 transition-all group border-b border-base border-t-0"
                    :class="[
                      settings.docksHidden.includes(member.id) ? 'op40' : '',
                      hasMoved && draggingId === member.id ? 'op30 bg-gray/10' : '',
                      dragOverId === member.id ? 'ring-1.5 ring-purple/50 rounded' : '',
                      hasMoved ? 'select-none' : '',
                    ]"
                  >
                    <!-- drag icon -->
                    <div
                      class="i-ph-dots-six-vertical w-4 h-4 shrink-0 op25 group-hover:op50 transition-opacity cursor-grab"
                      :style="hasMoved && draggingId === member.id ? 'cursor: grabbing' : ''"
                    />

                    <!-- Visibility toggle -->
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-base transition-colors shrink-0"
                      :class="settings.docksHidden.includes(member.id) ? 'op50' : ''"
                      :title="settings.docksHidden.includes(member.id) ? 'Show' : 'Hide'"
                      @click="toggleDock(member.id)"
                    >
                      <div
                        class="w-4 h-4 rounded flex items-center justify-center transition-colors"
                        :class="settings.docksHidden.includes(member.id) ? 'bg-gray/30' : 'bg-primary/20 text-primary'"
                      >
                        <div
                          v-if="!settings.docksHidden.includes(member.id)"
                          class="i-ph-check-bold text-xs"
                        />
                      </div>
                    </button>

                    <!-- Icon & Title -->
                    <DockIcon
                      :icon="member.icon"
                      :title="member.title"
                      class="w-5 h-5 shrink-0"
                      :class="settings.docksHidden.includes(member.id) ? 'saturate-0' : ''"
                    />
                    <span
                      class="truncate text-sm"
                      :class="settings.docksHidden.includes(member.id) ? 'line-through op60' : ''"
                    >
                      {{ member.title }}
                    </span>
                    <HashBadge
                      v-if="member.type === 'action'"
                      label="Action"
                      class="flex-none text-xs"
                    />

                    <div class="flex flex-auto" />

                    <!-- Order controls -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        v-if="memberIndex > 0"
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move up (higher priority)"
                        @click="moveOrder(GROUP_SUBCAT_CONTAINER(dock.id, subcategory), member.id, -1)"
                      >
                        <div class="i-ph-caret-up text-sm op60" />
                      </button>
                      <button
                        v-if="memberIndex < members.length - 1"
                        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray/20 transition-colors"
                        title="Move down (lower priority)"
                        @click="moveOrder(GROUP_SUBCAT_CONTAINER(dock.id, subcategory), member.id, 1)"
                      >
                        <div class="i-ph-caret-down text-sm op60" />
                      </button>
                    </div>

                    <!-- Pin toggle -->
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray/20 transition-colors shrink-0"
                      :class="settings.docksPinned.includes(member.id) ? 'text-amber' : 'op40 hover:op70'"
                      :title="settings.docksPinned.includes(member.id) ? 'Unpin' : 'Pin'"
                      @click="togglePin(member.id)"
                    >
                      <div
                        :class="settings.docksPinned.includes(member.id) ? 'i-ph-push-pin-fill rotate--45' : 'i-ph-push-pin'"
                        class="text-base"
                      />
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
