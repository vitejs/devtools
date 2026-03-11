import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocksContext } from '../context'

const { requestDockPopupOpenMock } = vi.hoisted(() => {
  return {
    requestDockPopupOpenMock: vi.fn(),
  }
})

vi.mock('../popup', () => {
  return {
    requestDockPopupOpen: requestDockPopupOpenMock,
  }
})

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

describe('dock popup entry switching', () => {
  beforeEach(() => {
    requestDockPopupOpenMock.mockClear()
  })

  it('routes popup entry through popup request event flow', async () => {
    const rpc = createMockRpc()
    const context = await createDocksContext('embedded', rpc)

    const result = await context.docks.switchEntry('~popup')

    expect(result).toBe(true)
    expect(requestDockPopupOpenMock).toHaveBeenCalledTimes(1)
    expect(requestDockPopupOpenMock).toHaveBeenCalledWith(context)
    expect(context.panel.store.open).toBe(false)
    expect(context.docks.selectedId).toBeNull()
  })
})
