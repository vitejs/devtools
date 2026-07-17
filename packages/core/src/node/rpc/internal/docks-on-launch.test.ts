import { describe, expect, it, vi } from 'vitest'
import { docksOnLaunch } from './docks-on-launch'

interface FakeLauncher {
  id: string
  type: string
  title: string
  icon: string
  launcher: { title: string, status: string, error?: string, onLaunch: () => Promise<void> }
}

function fakeContext(entry: FakeLauncher): { handler: (id: string) => Promise<unknown>, store: Map<string, FakeLauncher> } {
  const store = new Map<string, FakeLauncher>([[entry.id, entry]])
  const context = {
    docks: {
      values: () => [...store.values()],
      update: (e: FakeLauncher) => store.set(e.id, e),
    },
  }
  const setup = docksOnLaunch.setup as (ctx: any) => { handler: (id: string) => Promise<unknown> }
  const { handler } = setup(context)
  return { handler, store }
}

describe('docksOnLaunch', () => {
  it('re-runs onLaunch on a subsequent call so a failed launch can be retried', async () => {
    const onLaunch = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('No test files found'))
      .mockResolvedValueOnce(undefined)

    const { handler, store } = fakeContext({
      id: 'my-app',
      type: 'launcher',
      title: 'My App',
      icon: 'ph:rocket-launch-duotone',
      launcher: { title: 'My App', status: 'idle', onLaunch },
    })

    // First launch fails → error state, with the failure message surfaced.
    await handler('my-app')
    expect(onLaunch).toHaveBeenCalledTimes(1)
    expect(store.get('my-app')!.launcher.status).toBe('error')
    expect(store.get('my-app')!.launcher.error).toBe('No test files found')

    // Retry re-runs the launch (the in-flight cache was cleared on settle).
    await handler('my-app')
    expect(onLaunch).toHaveBeenCalledTimes(2)
    expect(store.get('my-app')!.launcher.status).toBe('success')
  })

  it('de-dupes concurrent launches of the same entry', async () => {
    let resolve!: () => void
    const onLaunch = vi.fn(() => new Promise<void>((r) => {
      resolve = r
    }))

    const { handler } = fakeContext({
      id: 'my-app',
      type: 'launcher',
      title: 'My App',
      icon: 'ph:rocket-launch-duotone',
      launcher: { title: 'My App', status: 'idle', onLaunch },
    })

    const a = handler('my-app')
    const b = handler('my-app')
    resolve()
    await Promise.all([a, b])

    expect(onLaunch).toHaveBeenCalledTimes(1)
  })
})
