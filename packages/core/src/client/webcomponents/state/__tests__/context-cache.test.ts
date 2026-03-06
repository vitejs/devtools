import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { describe, expect, it } from 'vitest'
import { createDocksContext } from '../context'
import { useDocksEntries } from '../docks'

function createMockRpc(entries: DevToolsDockEntry[] = []): DevToolsRpcClient {
  const docksState = createSharedState({
    initialValue: entries,
    enablePatches: false,
  })

  const settingsState = createSharedState({
    initialValue: DEFAULT_STATE_USER_SETTINGS(),
    enablePatches: false,
  })

  return {
    sharedState: {
      get: async (key: string) => {
        if (key === 'devtoolskit:internal:docks')
          return docksState as any
        if (key === 'devtoolskit:internal:user-settings')
          return settingsState as any
        throw new Error(`Unexpected shared state key: ${key}`)
      },
    },
  } as unknown as DevToolsRpcClient
}

describe('dock state caches', () => {
  it('scopes createDocksContext cache by rpc instance', async () => {
    const rpcA = createMockRpc()
    const rpcB = createMockRpc()

    const contextA1 = await createDocksContext('embedded', rpcA)
    const contextA2 = await createDocksContext('standalone', rpcA)
    const contextB = await createDocksContext('embedded', rpcB)

    expect(contextA1).toBe(contextA2)
    expect(contextA1).not.toBe(contextB)
  })

  it('scopes useDocksEntries cache by rpc instance', async () => {
    const rpcA = createMockRpc()
    const rpcB = createMockRpc()

    const entriesA1 = await useDocksEntries(rpcA)
    const entriesA2 = await useDocksEntries(rpcA)
    const entriesB = await useDocksEntries(rpcB)

    expect(entriesA1).toBe(entriesA2)
    expect(entriesA1).not.toBe(entriesB)
  })
})
