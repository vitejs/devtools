import type { DevToolsNodeContext, DevToolsTerminalSession } from 'devframe/types'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsTerminalHost } from '../host-terminals'

describe('devToolsTerminalHost', () => {
  it('disposes bound stream entry on remove', () => {
    const host = new DevToolsTerminalHost({} as DevToolsNodeContext)
    const session: DevToolsTerminalSession = {
      id: 'terminal-1',
      title: 'Terminal 1',
      status: 'running',
    }

    const dispose = vi.fn()

    ;(host as any).sessions.set(session.id, session)
    ;(host as any)._boundStreams.set(session.id, {
      dispose,
      stream: new ReadableStream(),
    })

    host.remove(session)

    expect(dispose).toHaveBeenCalledTimes(1)
    expect((host as any)._boundStreams.has(session.id)).toBe(false)
  })
})
