import type { BirpcReturn } from 'birpc'
import type { PeerDescriptor, PeerId, TransportKind } from './types'

/**
 * A Link is one established RPC connection between the local peer and one
 * remote peer, over one transport. In Phase 1 (no routing), each Link
 * directly wraps a birpc instance.
 *
 * Links are created by adapters during connect/listen and tracked by the
 * PeerMesh.
 */
export interface Link {
  readonly id: string
  readonly remote: PeerDescriptor
  readonly kind: TransportKind
  readonly isDirect: boolean
  /** The raw birpc handle — used internally by PeerHandle to dispatch calls. */
  readonly rpc: BirpcReturn<any, any, false>
  readonly meta: Record<string, unknown>
  close: () => void
  onClose: (fn: () => void) => () => void
}

export interface CreateLinkOptions {
  id: string
  remote: PeerDescriptor
  kind: TransportKind
  rpc: BirpcReturn<any, any, false>
  isDirect?: boolean
  meta?: Record<string, unknown>
  onClose?: () => void
}

/**
 * Create a Link object for tracking in the mesh.
 */
export function createLink(options: CreateLinkOptions): Link {
  const closeListeners = new Set<() => void>()
  let closed = false

  const close = (): void => {
    if (closed)
      return
    closed = true
    options.onClose?.()
    for (const fn of closeListeners)
      fn()
    closeListeners.clear()
  }

  return {
    id: options.id,
    remote: options.remote,
    kind: options.kind,
    isDirect: options.isDirect ?? true,
    rpc: options.rpc,
    meta: options.meta ?? {},
    close,
    onClose(fn) {
      closeListeners.add(fn)
      return () => closeListeners.delete(fn)
    },
  }
}

/**
 * A table of links keyed by remote peer id.
 *
 * The mesh keeps one of these per local peer; each remote peer may have
 * multiple links across different transports — higher-priority links are
 * preferred.
 */
export class LinkTable {
  private readonly byPeer: Map<PeerId, Link[]> = new Map()

  add(link: Link): void {
    const list = this.byPeer.get(link.remote.id) ?? []
    list.push(link)
    this.byPeer.set(link.remote.id, list)
  }

  remove(link: Link): void {
    const list = this.byPeer.get(link.remote.id)
    if (!list)
      return
    const idx = list.indexOf(link)
    if (idx >= 0)
      list.splice(idx, 1)
    if (list.length === 0)
      this.byPeer.delete(link.remote.id)
  }

  get(id: PeerId): Link[] {
    return this.byPeer.get(id) ?? []
  }

  /**
   * Pick the best link for reaching a peer. "Best" = direct > indirect, then
   * ordered by the transport priority declared on the remote descriptor.
   */
  pick(id: PeerId): Link | undefined {
    const links = this.get(id)
    if (links.length === 0)
      return undefined
    if (links.length === 1)
      return links[0]
    return [...links].sort((a, b) => {
      if (a.isDirect !== b.isDirect)
        return a.isDirect ? -1 : 1
      return 0
    })[0]
  }

  has(id: PeerId): boolean {
    return this.byPeer.has(id)
  }

  all(): Link[] {
    return Array.from(this.byPeer.values()).flat()
  }

  clear(): void {
    this.byPeer.clear()
  }
}
