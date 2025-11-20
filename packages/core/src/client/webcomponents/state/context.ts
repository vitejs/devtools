import type { ClientRpcReturn, DockClientScriptContext, DockEntryState, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { computed, markRaw, reactive, ref, toRefs, watchEffect } from 'vue'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, useDocksEntries } from './docks'
import { executeSetupScript } from './setup-script'

let _docksContext: DocksContext | undefined
export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpcReturn: ClientRpcReturn,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  if (_docksContext) {
    return _docksContext
  }

  const selectedId = ref<string | null>(null)
  const dockEntries = await useDocksEntries(rpcReturn)
  const selected = computed(() => dockEntries.value.find(entry => entry.id === selectedId.value) ?? null)

  const dockEntryStateMap: Map<string, DockEntryState> = reactive(new Map())
  watchEffect(() => {
    for (const entry of dockEntries.value) {
      if (dockEntryStateMap.has(entry.id)) {
        dockEntryStateMap.get(entry.id)!.entryMeta = entry
        continue
      }
      dockEntryStateMap.set(
        entry.id,
        createDockEntryState(entry, selected),
      )
    }
  })

  panelStore ||= ref(DEFAULT_DOCK_PANEL_STORE())

  _docksContext = reactive({
    panel: {
      store: panelStore,
      isDragging: false,
      isResizing: false,
      isVertical: computed(() => panelStore.value.position === 'left' || panelStore.value.position === 'right'),
    },
    docks: {
      selectedId,
      selected,
      entries: dockEntries,
      entryToStateMap: markRaw(dockEntryStateMap),
      getStateById: (id: string) => dockEntryStateMap.get(id),
      switchEntry: async (id: string | null = null) => {
        if (id == null) {
          selectedId.value = null
          return true
        }
        const entry = dockEntries.value.find(e => e.id === id)
        if (!entry)
          return false
        selectedId.value = entry.id

        // If has import script, run it
        if (
          (entry.type === 'action')
          || (entry.type === 'custom-render')
          || (entry.type === 'iframe' && entry.clientScript)
        ) {
          const current = dockEntryStateMap.get(id)!
          const scriptContext: DockClientScriptContext = reactive({
            ...toRefs(_docksContext!) as any,
            current,
          })
          await executeSetupScript(entry, scriptContext)
        }

        selectedId.value = entry.id
        panelStore.value.open = true
        return true
      },
    },
    rpc: rpcReturn.rpc,
    clientRpc: rpcReturn.clientRpc,
    clientType,
  })

  return _docksContext!
}
