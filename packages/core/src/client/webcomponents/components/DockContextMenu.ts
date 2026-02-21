import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { h } from 'vue'
import { setDockContextMenu } from '../state/floating-tooltip'

interface DockMenuItem {
  label: string
  icon: string
  action: () => void
  visible: boolean
}

function renderMenuItem(item: DockMenuItem) {
  return h('button', {
    class: 'flex items-center gap-2 px3 py1.5 rounded hover:bg-active transition text-left',
    onClick: item.action,
  }, [
    h('div', { class: `${item.icon} text-base op60` }),
    h('span', item.label),
  ])
}

function hideDock(context: DocksContext, entry: DevToolsDockEntry) {
  const settingsStore = context.docks.settings
  const id = entry.id
  settingsStore.mutate((state) => {
    if (!state.docksHidden.includes(id))
      state.docksHidden = [...state.docksHidden, id]
  })
  if (context.docks.selected?.id === id)
    context.docks.switchEntry(null)
  setDockContextMenu(null)
}

function refreshDock(context: DocksContext, entry: DevToolsDockEntry) {
  const state = context.docks.getStateById(entry.id)
  const iframe = state?.domElements.iframe
  if (!iframe) {
    setDockContextMenu(null)
    return
  }
  const src = iframe.src
  iframe.src = ''
  iframe.src = src
  setDockContextMenu(null)
}

function canHide(context: DocksContext, entry: DevToolsDockEntry) {
  return context.docks.entries.some(item => item.id === entry.id)
}

function canRefresh(entry: DevToolsDockEntry) {
  return entry.type === 'iframe'
}

export function openDockContextMenu(options: {
  context: DocksContext
  entry: DevToolsDockEntry
  el: HTMLElement
  gap?: number
}) {
  const { context, entry, el, gap = 6 } = options
  const items: DockMenuItem[] = [
    {
      label: 'Hide',
      icon: 'i-ph-eye-slash-duotone',
      action: () => hideDock(context, entry),
      visible: canHide(context, entry),
    },
    {
      label: 'Refresh',
      icon: 'i-ph-arrow-clockwise-duotone',
      action: () => refreshDock(context, entry),
      visible: canRefresh(entry),
    },
  ].filter(item => item.visible)

  if (items.length === 0)
    return

  setDockContextMenu({
    el,
    gap,
    content: () => h('div', { class: 'flex flex-col text-sm min-w-36' }, items.map(renderMenuItem)),
  })
}
