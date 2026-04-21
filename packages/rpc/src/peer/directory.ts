import type { PeerDescriptor, PeerId, PeerQuery, PeerRole, PeerRolePattern } from './types'

/**
 * Match a role against a pattern like `iframe:*` or `*`.
 */
export function matchRolePattern(role: PeerRole, pattern: PeerRole | PeerRolePattern): boolean {
  if (pattern === '*' || pattern === role)
    return true
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1)
    return role.startsWith(prefix)
  }
  return false
}

/**
 * Check whether a descriptor matches a query.
 */
export function matchPeer(peer: PeerDescriptor, query: PeerQuery): boolean {
  if (query.role && !matchRolePattern(peer.role, query.role))
    return false
  if (query.capability && !peer.capabilities.includes(query.capability))
    return false
  if (query.meta) {
    for (const key of Object.keys(query.meta)) {
      if (peer.meta[key] !== query.meta[key])
        return false
    }
  }
  return true
}

type DirectoryChangeKind = 'added' | 'removed' | 'updated'

/**
 * A registry of known peers in the mesh.
 *
 * On the devtools-server, this is authoritative. On other peers, this is an
 * eventually-consistent replica populated by the server's
 * `directory-delta` broadcasts.
 */
export class PeerDirectory {
  private readonly peers: Map<PeerId, PeerDescriptor> = new Map()
  private readonly listeners: Set<(kind: DirectoryChangeKind, peer: PeerDescriptor) => void> = new Set()

  list(): PeerDescriptor[] {
    return Array.from(this.peers.values())
  }

  get(id: PeerId): PeerDescriptor | undefined {
    return this.peers.get(id)
  }

  has(id: PeerId): boolean {
    return this.peers.has(id)
  }

  query(q: PeerQuery): PeerDescriptor[] {
    return this.list().filter(peer => matchPeer(peer, q))
  }

  /**
   * Resolve a target (id, role, or query) to a set of concrete peers.
   */
  resolve(target: PeerId | PeerRole | PeerRolePattern | PeerQuery): PeerDescriptor[] {
    if (typeof target === 'object')
      return this.query(target)
    const byId = this.peers.get(target)
    if (byId)
      return [byId]
    return this.list().filter(peer => matchRolePattern(peer.role, target as PeerRolePattern))
  }

  upsert(peer: PeerDescriptor): DirectoryChangeKind {
    const existing = this.peers.get(peer.id)
    this.peers.set(peer.id, peer)
    const kind: DirectoryChangeKind = existing ? 'updated' : 'added'
    this.emit(kind, peer)
    return kind
  }

  remove(id: PeerId): boolean {
    const existing = this.peers.get(id)
    if (!existing)
      return false
    this.peers.delete(id)
    this.emit('removed', existing)
    return true
  }

  clear(): void {
    const snapshot = this.list()
    this.peers.clear()
    for (const peer of snapshot)
      this.emit('removed', peer)
  }

  onChange(fn: (kind: DirectoryChangeKind, peer: PeerDescriptor) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(kind: DirectoryChangeKind, peer: PeerDescriptor): void {
    for (const fn of this.listeners)
      fn(kind, peer)
  }
}
