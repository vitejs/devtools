import type { Link } from './link'
import type {
  PeerDescriptor,
  PeerHandle,
  PeerId,
  PeerMeshEvents,
  PeerQuery,
  PeerRole,
  PeerRolePattern,
  TransportAdapter,
  TransportAdapterContext,
} from './types'
import { PeerDirectory } from './directory'
import { LinkTable } from './link'

export interface PeerMeshOptions {
  self: PeerDescriptor
}

export interface BroadcastOptions<Args extends any[] = any[]> {
  to?: PeerId | PeerRole | PeerRolePattern | PeerQuery
  method: string
  args: Args
  /** Don't wait for replies; fire-and-forget. */
  event?: boolean
  /** Don't error if the target doesn't have the method. */
  optional?: boolean
  /** Custom filter to exclude specific links after target resolution. */
  filter?: (link: Link) => boolean
}

type Listeners<E> = {
  [K in keyof E]: Set<E[K]>
}

/**
 * The PeerMesh is the top-level object each process holds. It tracks the
 * local peer's identity, the directory of known remote peers, and the set
 * of currently-established links.
 *
 * Transport adapters are registered via {@link register}. Each adapter is
 * responsible for establishing links; when a link is established the adapter
 * calls {@link PeerMesh.attachLink} to register it in the mesh.
 */
export class PeerMesh {
  readonly self: PeerDescriptor
  readonly directory: PeerDirectory = new PeerDirectory()
  readonly links: LinkTable = new LinkTable()

  private readonly adapters: Set<TransportAdapter> = new Set()
  private readonly adapterDisposers: Map<TransportAdapter, () => void> = new Map()
  private readonly listeners: Listeners<PeerMeshEvents> = {
    'peer:connected': new Set(),
    'peer:disconnected': new Set(),
    'peer:updated': new Set(),
  }

  constructor(options: PeerMeshOptions) {
    this.self = options.self
    this.directory.upsert(options.self)
  }

  /**
   * Register a transport adapter. Calls the adapter's `setup` with a context
   * that exposes {@link attachLink} and a read-only directory view.
   */
  async register(adapter: TransportAdapter, disposer?: () => void): Promise<() => void> {
    this.adapters.add(adapter)
    if (disposer)
      this.adapterDisposers.set(adapter, disposer)
    const context = this.createAdapterContext()
    await adapter.setup?.(context)
    return () => {
      void adapter.dispose?.()
      this.adapters.delete(adapter)
      const dispose = this.adapterDisposers.get(adapter)
      if (dispose)
        dispose()
      this.adapterDisposers.delete(adapter)
    }
  }

  private createAdapterContext(): TransportAdapterContext {
    return {
      self: this.self,
      attachLink: link => this.attachLink(link),
      directory: {
        list: () => this.directory.list(),
        get: id => this.directory.get(id),
      },
    }
  }

  /**
   * List all registered adapters.
   */
  getAdapters(): TransportAdapter[] {
    return Array.from(this.adapters)
  }

  /**
   * Attach an established link to the mesh. Called by adapters after they
   * establish a connection. Also upserts the remote peer in the directory.
   */
  attachLink(link: Link): void {
    this.directory.upsert(link.remote)
    this.links.add(link)
    this.emit('peer:connected', link.remote)
    link.onClose(() => {
      this.links.remove(link)
      if (this.links.get(link.remote.id).length === 0) {
        this.directory.remove(link.remote.id)
        this.emit('peer:disconnected', link.remote.id)
      }
    })
  }

  /**
   * Get a handle to call a specific peer. The target may be a peer id, a
   * role, a role pattern, or a free-form query.
   */
  peer(target: PeerId | PeerRole | PeerRolePattern | PeerQuery): PeerHandle {
    return createPeerHandle(this, target)
  }

  /**
   * Return handles for every peer matching the query.
   */
  findPeers(query: PeerQuery): PeerHandle[] {
    return this.directory.query(query).map(peer => createPeerHandle(this, peer.id))
  }

  /**
   * Send a call to every peer matching the target, filtered optionally.
   */
  async broadcast<Args extends any[] = any[]>(options: BroadcastOptions<Args>): Promise<void> {
    const { method, args, event = false, optional = true, filter } = options
    const targets = options.to
      ? this.directory.resolve(options.to).map(p => p.id)
      : this.directory.list().filter(p => p.id !== this.self.id).map(p => p.id)

    await Promise.allSettled(
      targets.flatMap((id) => {
        const links = this.links.get(id)
        const link = this.links.pick(id)
        if (!link)
          return []
        if (filter && !filter(link))
          return []
        void links
        return [
          link.rpc.$callRaw({
            method,
            args,
            event,
            optional,
          }),
        ]
      }),
    )
  }

  on<K extends keyof PeerMeshEvents>(event: K, fn: PeerMeshEvents[K]): () => void {
    this.listeners[event].add(fn)
    return () => this.listeners[event].delete(fn)
  }

  private emit<K extends keyof PeerMeshEvents>(event: K, ...args: Parameters<PeerMeshEvents[K]>): void {
    for (const fn of this.listeners[event])
      (fn as (...a: any[]) => void)(...args)
  }
}

const SERVER_PEER_ID = 'devtools-server'
const RELAY_METHOD = 'devtoolskit:internal:mesh:relay'
const RELAY_EVENT_METHOD = 'devtoolskit:internal:mesh:relay-event'

function createPeerHandle(mesh: PeerMesh, target: PeerId | PeerRole | PeerRolePattern | PeerQuery): PeerHandle {
  const resolveLink = (): Link | undefined => {
    const peers = mesh.directory.resolve(target)
    for (const peer of peers) {
      const link = mesh.links.pick(peer.id)
      if (link)
        return link
    }
    return undefined
  }

  const resolveDescriptor = (): PeerDescriptor => {
    const peers = mesh.directory.resolve(target)
    return peers[0] ?? {
      id: typeof target === 'string' ? target : '',
      role: (typeof target === 'string' ? target : 'unknown') as PeerRole,
      capabilities: [],
      meta: {},
      links: [],
    }
  }

  // Resolve the server link for relay fallback. Returns undefined when this
  // peer IS the server (self.role === 'devtools-server'), since servers do
  // not relay through themselves.
  const resolveServerLink = (): Link | undefined => {
    if (mesh.self.role === 'devtools-server')
      return undefined
    return mesh.links.pick(SERVER_PEER_ID)
  }

  return {
    get descriptor() {
      return resolveDescriptor()
    },
    get isDirect() {
      const link = resolveLink()
      return link?.isDirect ?? false
    },
    async call(method, ...args) {
      const link = resolveLink()
      if (link) {
        return await (link.rpc as any).$call(method, ...args)
      }
      const server = resolveServerLink()
      if (!server) {
        throw new Error(`[PeerMesh] No link available to target ${JSON.stringify(target)}`)
      }
      return await (server.rpc as any).$call(RELAY_METHOD, {
        to: target,
        method,
        args,
      })
    },
    callEvent(method, ...args) {
      const link = resolveLink()
      if (link) {
        ;(link.rpc as any).$callEvent(method, ...args)
        return
      }
      const server = resolveServerLink()
      if (!server) {
        return
      }
      ;(server.rpc as any).$callEvent(RELAY_EVENT_METHOD, {
        to: target,
        method,
        args,
      })
    },
    async callOptional(method, ...args) {
      const link = resolveLink()
      if (link) {
        return await (link.rpc as any).$callOptional(method, ...args)
      }
      const server = resolveServerLink()
      if (!server)
        return undefined
      try {
        return await (server.rpc as any).$call(RELAY_METHOD, {
          to: target,
          method,
          args,
        })
      }
      catch {
        return undefined
      }
    },
  } as PeerHandle
}
