import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksPanelContext } from '@vitejs/devtools-kit/client'
import type { IframePanes } from 'iframe-pane'
import type { ShallowRef } from 'vue'
import { createIframePanes } from 'iframe-pane'
import { markRaw, onScopeDispose, shallowRef, watch } from 'vue'

export function getEntryPaneKey(entry: DevToolsDockEntry | null | undefined): string | null {
  if (!entry)
    return null
  return entry.type === 'iframe' ? (entry.frameId ?? entry.id) : entry.id
}

/**
 * Own an {@link IframePanes} manager for a dock shell, parking its persistent
 * iframe/element panes in the given overlay container.
 *
 * The manager is created lazily once the container element exists (it is a
 * template ref that starts empty), and torn down when the owning scope is
 * disposed. When a `panel` context is supplied, its geometry is watched so
 * panes stay glued to their targets during moves the shared `ResizeObserver`
 * can't see, and pointer events on every pane are locked while the panel is
 * dragged or resized so iframes don't swallow the interaction.
 */
export function useIframePanes(
  container: Readonly<ShallowRef<HTMLElement | undefined | null>>,
  panel?: DocksPanelContext,
  getActiveKey?: () => string | null,
): Readonly<ShallowRef<IframePanes | undefined>> {
  const panes = shallowRef<IframePanes>()

  const stop = watch(
    container,
    (el) => {
      if (el && !panes.value) {
        panes.value = markRaw(createIframePanes({ container: el, document: el.ownerDocument }))
        stop()
      }
    },
    { immediate: true, flush: 'post' },
  )

  if (getActiveKey) {
    watch(
      getActiveKey,
      (activeKey) => {
        panes.value?.list().forEach((pane) => {
          if (pane.id !== activeKey)
            pane.hide()
        })
      },
      { flush: 'post' },
    )
  }

  if (panel) {
    // A panel move changes its box position without resizing the target, so the
    // shared ResizeObserver/scroll listeners never fire — re-sync explicitly.
    watch(() => panel, () => panes.value?.updateAll(), { deep: true })

    // Iframes capture pointer events, which breaks dragging/resizing happening
    // above them — lock them for the duration of the interaction.
    let release: (() => void) | undefined
    watch(
      () => panel.isDragging || panel.isResizing,
      (locked) => {
        if (locked) {
          release ??= panes.value?.lockPointerEvents()
        }
        else {
          release?.()
          release = undefined
        }
      },
      { flush: 'sync' },
    )
    onScopeDispose(() => release?.())
  }

  onScopeDispose(() => panes.value?.dispose())

  return panes
}
