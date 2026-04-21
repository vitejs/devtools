import type { PeerDescriptor } from './types'
import { describe, expect, it, vi } from 'vitest'
import { matchPeer, matchRolePattern, PeerDirectory } from './directory'

function makePeer(partial: Partial<PeerDescriptor> & { id: string, role: string }): PeerDescriptor {
  return {
    capabilities: [],
    meta: {},
    links: [],
    ...partial,
  }
}

describe('matchRolePattern', () => {
  it('matches exact role', () => {
    expect(matchRolePattern('iframe:rolldown', 'iframe:rolldown')).toBe(true)
    expect(matchRolePattern('iframe:rolldown', 'iframe:vite')).toBe(false)
  })

  it('matches wildcard prefix patterns', () => {
    expect(matchRolePattern('iframe:rolldown', 'iframe:*')).toBe(true)
    expect(matchRolePattern('iframe:vite', 'iframe:*')).toBe(true)
    expect(matchRolePattern('client:embedded', 'iframe:*')).toBe(false)
  })

  it('matches global wildcard', () => {
    expect(matchRolePattern('anything:here', '*')).toBe(true)
    expect(matchRolePattern('devtools-server', '*')).toBe(true)
  })
})

describe('matchPeer', () => {
  const peer = makePeer({
    id: 'p1',
    role: 'iframe:rolldown',
    capabilities: ['dom-access'],
    meta: { plugin: 'rolldown', version: '2' },
  })

  it('matches by role', () => {
    expect(matchPeer(peer, { role: 'iframe:rolldown' })).toBe(true)
    expect(matchPeer(peer, { role: 'iframe:*' })).toBe(true)
    expect(matchPeer(peer, { role: 'client:*' })).toBe(false)
  })

  it('matches by capability', () => {
    expect(matchPeer(peer, { capability: 'dom-access' })).toBe(true)
    expect(matchPeer(peer, { capability: 'fs-read' })).toBe(false)
  })

  it('matches by meta', () => {
    expect(matchPeer(peer, { meta: { plugin: 'rolldown' } })).toBe(true)
    expect(matchPeer(peer, { meta: { plugin: 'vite' } })).toBe(false)
  })

  it('matches combined query', () => {
    expect(matchPeer(peer, { role: 'iframe:*', capability: 'dom-access' })).toBe(true)
    expect(matchPeer(peer, { role: 'iframe:*', capability: 'fs-read' })).toBe(false)
  })
})

describe('peerDirectory', () => {
  it('upserts, lists, gets, removes', () => {
    const dir = new PeerDirectory()
    dir.upsert(makePeer({ id: 'a', role: 'client:embedded' }))
    dir.upsert(makePeer({ id: 'b', role: 'iframe:rolldown' }))

    expect(dir.list()).toHaveLength(2)
    expect(dir.get('a')?.role).toBe('client:embedded')
    expect(dir.has('b')).toBe(true)

    expect(dir.remove('a')).toBe(true)
    expect(dir.list()).toHaveLength(1)
    expect(dir.has('a')).toBe(false)
  })

  it('distinguishes add vs update in upsert result', () => {
    const dir = new PeerDirectory()
    expect(dir.upsert(makePeer({ id: 'a', role: 'client:embedded' }))).toBe('added')
    expect(dir.upsert(makePeer({ id: 'a', role: 'client:standalone' }))).toBe('updated')
  })

  it('queries by role pattern', () => {
    const dir = new PeerDirectory()
    dir.upsert(makePeer({ id: 'a', role: 'iframe:rolldown' }))
    dir.upsert(makePeer({ id: 'b', role: 'iframe:vite' }))
    dir.upsert(makePeer({ id: 'c', role: 'client:embedded' }))

    const iframes = dir.query({ role: 'iframe:*' })
    expect(iframes.map(p => p.id).sort()).toEqual(['a', 'b'])
  })

  it('resolve handles id, role, and pattern', () => {
    const dir = new PeerDirectory()
    dir.upsert(makePeer({ id: 'a', role: 'iframe:rolldown' }))
    dir.upsert(makePeer({ id: 'b', role: 'iframe:vite' }))

    expect(dir.resolve('a').map(p => p.id)).toEqual(['a'])
    expect(dir.resolve('iframe:rolldown').map(p => p.id)).toEqual(['a'])
    expect(dir.resolve('iframe:*').map(p => p.id).sort()).toEqual(['a', 'b'])
    expect(dir.resolve({ role: 'iframe:*' }).map(p => p.id).sort()).toEqual(['a', 'b'])
  })

  it('emits change events', () => {
    const dir = new PeerDirectory()
    const listener = vi.fn()
    dir.onChange(listener)

    const peer = makePeer({ id: 'a', role: 'client:embedded' })
    dir.upsert(peer)
    expect(listener).toHaveBeenCalledWith('added', peer)

    listener.mockClear()
    const updated = { ...peer, role: 'client:standalone' }
    dir.upsert(updated)
    expect(listener).toHaveBeenCalledWith('updated', updated)

    listener.mockClear()
    dir.remove('a')
    expect(listener).toHaveBeenCalledWith('removed', updated)
  })

  it('clear empties and emits removed for each', () => {
    const dir = new PeerDirectory()
    dir.upsert(makePeer({ id: 'a', role: 'client:embedded' }))
    dir.upsert(makePeer({ id: 'b', role: 'iframe:rolldown' }))

    const listener = vi.fn()
    dir.onChange(listener)
    dir.clear()

    expect(dir.list()).toHaveLength(0)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
