import type { DevToolsClientContext } from './docks'
import { setDevframeClientContext } from '@devframes/hub/client'
import { afterEach, describe, expect, it } from 'vitest'
import { getDevToolsClientContext } from './context'

describe('getDevToolsClientContext', () => {
  afterEach(() => {
    setDevframeClientContext(undefined)
  })

  it('returns the context the hub client runtime publishes', () => {
    // `@devframes/hub-ui`'s embedded and standalone clients publish their
    // context through `setDevframeClientContext`.
    const context = { clientType: 'embedded' } as DevToolsClientContext
    setDevframeClientContext(context)

    expect(getDevToolsClientContext()).toBe(context)
  })
})
