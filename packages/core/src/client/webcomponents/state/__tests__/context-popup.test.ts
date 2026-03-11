import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocksContext } from '../context'

const {
  executeSetupScriptMock,
  registerMainFrameDockActionHandlerMock,
  requestDockPopupOpenMock,
  triggerMainFrameDockActionMock,
} = vi.hoisted(() => {
  return {
    executeSetupScriptMock: vi.fn(),
    registerMainFrameDockActionHandlerMock: vi.fn(),
    requestDockPopupOpenMock: vi.fn(),
    triggerMainFrameDockActionMock: vi.fn(),
  }
})

vi.mock('../popup', () => {
  return {
    registerMainFrameDockActionHandler: registerMainFrameDockActionHandlerMock,
    requestDockPopupOpen: requestDockPopupOpenMock,
    triggerMainFrameDockAction: triggerMainFrameDockActionMock,
  }
})

vi.mock('../setup-script', () => {
  return {
    executeSetupScript: executeSetupScriptMock,
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
    executeSetupScriptMock.mockReset()
    executeSetupScriptMock.mockResolvedValue(undefined)
    registerMainFrameDockActionHandlerMock.mockClear()
    requestDockPopupOpenMock.mockClear()
    triggerMainFrameDockActionMock.mockReset()
    triggerMainFrameDockActionMock.mockResolvedValue(undefined)
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

  it('registers action handler bridge on main frame context', async () => {
    const actionEntry: DevToolsDockEntry = {
      type: 'action',
      id: 'action-main-bridge',
      title: 'Action',
      icon: 'test',
      action: {
        importFrom: 'test',
        importName: 'default',
      },
    }
    const rpc = createMockRpc([actionEntry])
    const context = await createDocksContext('embedded', rpc)

    expect(registerMainFrameDockActionHandlerMock).toHaveBeenCalledTimes(1)
    const handler = registerMainFrameDockActionHandlerMock.mock.calls[0]?.[0]
    expect(handler).toBeTypeOf('function')

    const result = await handler?.('action-main-bridge')

    expect(result).toBe(true)
    expect(executeSetupScriptMock).toHaveBeenCalledTimes(1)
    expect(context.docks.selectedId).toBe('action-main-bridge')
  })

  it('delegates popup action click to main frame handler', async () => {
    triggerMainFrameDockActionMock.mockResolvedValue(true)
    const actionEntry: DevToolsDockEntry = {
      type: 'action',
      id: 'action-popup-delegated',
      title: 'Action',
      icon: 'test',
      action: {
        importFrom: 'test',
        importName: 'default',
      },
    }
    const rpc = createMockRpc([actionEntry])
    const context = await createDocksContext('embedded', rpc)

    const result = await context.docks.switchEntry('action-popup-delegated')

    expect(result).toBe(true)
    expect(triggerMainFrameDockActionMock).toHaveBeenCalledWith('action-popup-delegated')
    expect(executeSetupScriptMock).not.toHaveBeenCalled()
    expect(context.panel.store.open).toBe(false)
    expect(context.docks.selectedId).toBeNull()
  })

  it('falls back to local action handler when main frame delegation is unavailable', async () => {
    triggerMainFrameDockActionMock.mockResolvedValue(undefined)
    const actionEntry: DevToolsDockEntry = {
      type: 'action',
      id: 'action-popup-fallback',
      title: 'Action',
      icon: 'test',
      action: {
        importFrom: 'test',
        importName: 'default',
      },
    }
    const rpc = createMockRpc([actionEntry])
    const context = await createDocksContext('embedded', rpc)

    const result = await context.docks.switchEntry('action-popup-fallback')

    expect(result).toBe(true)
    expect(triggerMainFrameDockActionMock).toHaveBeenCalledWith('action-popup-fallback')
    expect(executeSetupScriptMock).toHaveBeenCalledTimes(1)
    expect(context.panel.store.open).toBe(true)
    expect(context.docks.selectedId).toBe('action-popup-fallback')
  })
})
