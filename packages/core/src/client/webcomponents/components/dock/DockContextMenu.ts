import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { h } from 'vue'
import { setDockContextMenu } from '../../state/floating-tooltip'
import { isDockPopupSupported, requestDockPopupOpen, useIsDockPopupOpen } from '../../state/popup'

// @unocss-include

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
  if (entry.id === '~settings')
    return false
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
  const isEdgeMode = context.panel.store.mode === 'edge'
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
    {
      label: isEdgeMode ? 'Float Mode' : 'Edge Mode',
      icon: isEdgeMode ? 'i-ph-arrows-out-duotone' : 'i-ph-square-half-bottom-duotone',
      action: () => {
        if (isEdgeMode) {
          // Reset float position defaults based on current edge position
          const store = context.panel.store
          switch (store.position) {
            case 'bottom':
              store.left = 50
              store.top = 100
              break
            case 'top':
              store.left = 50
              store.top = 0
              break
            case 'left':
              store.left = 0
              store.top = 50
              break
            case 'right':
              store.left = 100
              store.top = 50
              break
          }
          store.mode = 'float'
        }
        else {
          context.panel.store.mode = 'edge'
        }
        setDockContextMenu(null)
      },
      visible: context.clientType === 'embedded',
    },
    {
      label: 'Popup',
      icon: 'i-ph-arrow-square-out-duotone',
      action: () => {
        setDockContextMenu(null)
        requestDockPopupOpen(context)
      },
      visible: isDockPopupSupported() && !useIsDockPopupOpen().value && context.clientType === 'embedded',
    },
  ].filter(item => item.visible)

  if (items.length === 0)
    return

  setDockContextMenu({
    el,
    gap,
    content: () => h('div', { class: 'flex flex-col text-sm min-w-36 mx--1' }, items.map(renderMenuItem)),
  })
}
