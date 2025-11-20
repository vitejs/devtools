import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext, DocksContext } from '@vitejs/devtools-kit/client'
import { reactive, toRefs } from 'vue'
import { executeSetupScript } from './setup-script'

// TODO: refactor away of this
export function useStateHandlers(
  context: DocksContext,
) {
  async function selectDockEntry(entry?: DevToolsDockEntry) {
    if (!entry) {
      context.panel.store.open = false
      context.docks.selectedId = null
      return
    }
    if (context.docks.selectedId === entry.id) {
      return
    }

    const current = context.docks.getStateById(entry.id)!

    const scriptContext: DockClientScriptContext = reactive({
      ...toRefs(context) as any,
      current,
    })

    // If has import script, run it
    if (
      (entry.type === 'action')
      || (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      await executeSetupScript(entry, scriptContext)
    }

    context.docks.selectedId = entry.id
    context.panel.store.open = true
  }

  return {
    selectDockEntry,
  }
}
