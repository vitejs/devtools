import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteInspectContext } from '../../inspect/context'
import type { ViteInspectModuleUpdatedState } from '../inspect-module-updated'
import { getRpcHandler } from 'devframe/rpc'
import { describe, expect, it, vi } from 'vitest'
import { setViteInspectContext } from '../../inspect/context'
import { VITE_INSPECT_MODULE_UPDATED_STATE_KEY } from '../inspect-module-updated'
import { viteClearModuleTransform } from './vite-clear-module-transform'

describe('vite:inspect:clear-module-transform', () => {
  it('notifies clients after refreshing a module transform', async () => {
    const clearModuleTransform = vi.fn()
    const stateValue: ViteInspectModuleUpdatedState = {
      ids: null,
      updatedAt: 0,
    }
    const mutate = vi.fn((update: (state: typeof stateValue) => void) => update(stateValue))
    const get = vi.fn(async () => ({ mutate }))
    const devtoolsContext = {
      rpc: {
        sharedState: { get },
      },
    } as unknown as ViteDevToolsNodeContext
    const inspectContext = {
      queryEnv: () => ({ clearModuleTransform }),
    } as unknown as ViteInspectContext

    setViteInspectContext(devtoolsContext, inspectContext)
    const handler = await getRpcHandler(viteClearModuleTransform, devtoolsContext)
    await handler({ vite: 'vite1', env: 'client' }, '/src/main.ts')

    expect(clearModuleTransform).toHaveBeenCalledWith('/src/main.ts')
    expect(get).toHaveBeenCalledWith(VITE_INSPECT_MODULE_UPDATED_STATE_KEY, {
      initialValue: {
        ids: null,
        updatedAt: 0,
      },
    })
    expect(mutate).toHaveBeenCalledOnce()
    expect(stateValue).toMatchObject({
      ids: ['/src/main.ts'],
    })
    expect(stateValue.updatedAt).toBeGreaterThan(0)
  })
})
