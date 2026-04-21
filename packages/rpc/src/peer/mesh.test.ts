import type { BirpcReturn } from 'birpc'
import type { Link } from './link'
import type { PeerDescriptor } from './types'
import { describe, expect, it, vi } from 'vitest'
import { createLink } from './link'
import { PeerMesh } from './mesh'

function makePeer(id: string, role: string, extra: Partial<PeerDescriptor> = {}): PeerDescriptor {
  return {
    id,
    role,
    capabilities: [],
    meta: {},
    links: [],
    ...extra,
  }
}

function makeFakeRpc(responses: Record<string, (...args: any[]) => any> = {}): {
  rpc: BirpcReturn<any, any, false>
  calls: { method: string, args: any[], kind: 'call' | 'event' | 'optional' | 'raw' }[]
} {
  const calls: { method: string, args: any[], kind: 'call' | 'event' | 'optional' | 'raw' }[] = []
  const rpc = {
    $call: async (method: string, ...args: any[]) => {
      calls.push({ method, args, kind: 'call' })
      return responses[method]?.(...args)
    },
    $callEvent: (method: string, ...args: any[]) => {
      calls.push({ method, args, kind: 'event' })
      responses[method]?.(...args)
    },
    $callOptional: async (method: string, ...args: any[]) => {
      calls.push({ method, args, kind: 'optional' })
      return responses[method]?.(...args)
    },
    $callRaw: async ({ method, args }: { method: string, args: any[] }) => {
      calls.push({ method, args, kind: 'raw' })
      return responses[method]?.(...args)
    },
    $meta: {},
  } as unknown as BirpcReturn<any, any, false>
  return { rpc, calls }
}

function makeLink(remote: PeerDescriptor, rpc: BirpcReturn<any, any, false>): Link {
  return createLink({
    id: `test:${remote.id}`,
    remote,
    kind: 'ws',
    rpc,
    isDirect: true,
  })
}

describe('peerMesh', () => {
  it('seeds directory with self', () => {
    const self = makePeer('self', 'client:embedded')
    const mesh = new PeerMesh({ self })
    expect(mesh.directory.list()).toHaveLength(1)
    expect(mesh.directory.get('self')).toEqual(self)
  })

  it('registers adapter and runs setup', async () => {
    const self = makePeer('self', 'client:embedded')
    const mesh = new PeerMesh({ self })
    const setup = vi.fn()
    await mesh.register({ kind: 'ws', setup })
    expect(setup).toHaveBeenCalledTimes(1)
    const ctx = setup.mock.calls[0]![0]
    expect(ctx.self).toEqual(self)
    expect(typeof ctx.attachLink).toBe('function')
  })

  it('attachLink upserts peer and emits connected', async () => {
    const self = makePeer('self', 'client:embedded')
    const mesh = new PeerMesh({ self })
    const connectedListener = vi.fn()
    mesh.on('peer:connected', connectedListener)

    const remote = makePeer('remote', 'devtools-server')
    const { rpc } = makeFakeRpc()
    const link = makeLink(remote, rpc)
    mesh.attachLink(link)

    expect(mesh.directory.get('remote')).toEqual(remote)
    expect(mesh.links.all()).toContain(link)
    expect(connectedListener).toHaveBeenCalledWith(remote)
  })

  it('link close removes peer from directory and emits disconnected', async () => {
    const self = makePeer('self', 'client:embedded')
    const mesh = new PeerMesh({ self })
    const disconnectedListener = vi.fn()
    mesh.on('peer:disconnected', disconnectedListener)

    const remote = makePeer('remote', 'devtools-server')
    const { rpc } = makeFakeRpc()
    const link = makeLink(remote, rpc)
    mesh.attachLink(link)
    link.close()

    expect(mesh.directory.has('remote')).toBe(false)
    expect(disconnectedListener).toHaveBeenCalledWith('remote')
  })
})

describe('peerMesh.peer — direct vs relay', () => {
  function buildMesh(): {
    mesh: PeerMesh
    serverCalls: ReturnType<typeof makeFakeRpc>['calls']
    serverResponses: Record<string, (...args: any[]) => any>
  } {
    const self = makePeer('client-a', 'client:embedded')
    const mesh = new PeerMesh({ self })

    // Direct link to the devtools-server
    const server = makePeer('devtools-server', 'devtools-server')
    const serverResponses: Record<string, (...args: any[]) => any> = {}
    const { rpc: serverRpc, calls: serverCalls } = makeFakeRpc(serverResponses)
    const serverLink = makeLink(server, serverRpc)
    mesh.attachLink(serverLink)

    return { mesh, serverCalls, serverResponses }
  }

  it('uses direct link when available', async () => {
    const { mesh, serverCalls, serverResponses } = buildMesh()
    serverResponses['vite:config:get'] = () => ({ root: '/home/app' })

    const result = await mesh.peer('devtools-server').call('vite:config:get')
    expect(result).toEqual({ root: '/home/app' })

    expect(serverCalls).toHaveLength(1)
    expect(serverCalls[0]!.method).toBe('vite:config:get')
    expect(serverCalls[0]!.kind).toBe('call')
  })

  it('falls back to relay via server when no direct link exists', async () => {
    const { mesh, serverCalls, serverResponses } = buildMesh()

    // Add iframe:rolldown to the directory but no direct link
    mesh.directory.upsert(makePeer('peer-rolldown', 'iframe:rolldown'))

    serverResponses['devtoolskit:internal:mesh:relay'] = (input: any) => {
      // Simulate the server receiving the relay and forwarding — in the
      // real implementation the server would call the target's link; here
      // we just echo the inputs back so we can assert.
      return { ok: true, input }
    }

    const result = await mesh.peer('iframe:rolldown').call('rolldown:get-data', { id: 'x' }) as any
    expect(result.ok).toBe(true)
    expect(result.input).toEqual({
      to: 'iframe:rolldown',
      method: 'rolldown:get-data',
      args: [{ id: 'x' }],
    })

    const relayCall = serverCalls.find(c => c.method === 'devtoolskit:internal:mesh:relay')
    expect(relayCall).toBeDefined()
  })

  it('callEvent uses relay-event fallback when no direct link', () => {
    const { mesh, serverCalls } = buildMesh()
    mesh.directory.upsert(makePeer('peer-rolldown', 'iframe:rolldown'))

    mesh.peer('iframe:rolldown').callEvent('rolldown:notify', { payload: 1 })

    const relayEventCall = serverCalls.find(c => c.method === 'devtoolskit:internal:mesh:relay-event')
    expect(relayEventCall).toBeDefined()
    expect(relayEventCall?.kind).toBe('event')
    expect(relayEventCall?.args[0]).toEqual({
      to: 'iframe:rolldown',
      method: 'rolldown:notify',
      args: [{ payload: 1 }],
    })
  })

  it('throws when target has no direct link and peer is the server itself', async () => {
    // Server meshes should NOT attempt relay (they'd relay through themselves)
    const serverMesh = new PeerMesh({ self: makePeer('devtools-server', 'devtools-server') })
    await expect(
      serverMesh.peer('iframe:rolldown').call('some:fn'),
    ).rejects.toThrow(/No link available/)
  })

  it('broadcast targets direct-linked peers matching the role pattern', async () => {
    const { mesh } = buildMesh()

    const iframe1 = makePeer('p1', 'iframe:rolldown')
    const iframe2 = makePeer('p2', 'iframe:vite')
    const { rpc: rpc1, calls: calls1 } = makeFakeRpc()
    const { rpc: rpc2, calls: calls2 } = makeFakeRpc()
    mesh.attachLink(makeLink(iframe1, rpc1))
    mesh.attachLink(makeLink(iframe2, rpc2))

    await mesh.broadcast({
      to: 'iframe:*',
      method: 'theme:changed',
      args: [{ theme: 'dark' }],
      event: true,
    })

    expect(calls1.some(c => c.method === 'theme:changed')).toBe(true)
    expect(calls2.some(c => c.method === 'theme:changed')).toBe(true)
  })
})
