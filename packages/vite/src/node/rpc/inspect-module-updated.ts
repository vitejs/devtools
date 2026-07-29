import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'

export const VITE_INSPECT_MODULE_UPDATED_STATE_KEY = 'vite:inspect:module-updated'

export interface ViteInspectModuleUpdatedState {
  ids: string[] | null
  updatedAt: number
}

export type ViteInspectModuleUpdatedSharedState = SharedState<ViteInspectModuleUpdatedState>

export function getViteInspectModuleUpdatedState(
  context: ViteDevToolsNodeContext,
): Promise<ViteInspectModuleUpdatedSharedState> {
  return context.rpc.sharedState.get(VITE_INSPECT_MODULE_UPDATED_STATE_KEY, {
    initialValue: {
      ids: null,
      updatedAt: 0,
    },
  })
}

export function notifyViteInspectModuleUpdated(
  state: ViteInspectModuleUpdatedSharedState,
  ids: string[] | null = null,
): void {
  state.mutate((value) => {
    value.ids = ids
    value.updatedAt = Date.now()
  })
}
