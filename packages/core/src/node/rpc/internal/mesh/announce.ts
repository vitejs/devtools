import type { PeerDescriptor } from '@vitejs/devtools-rpc/peer'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface PeerAnnounceInput {
  role: string
  capabilities?: readonly string[]
  meta?: Record<string, unknown>
}

export interface PeerAnnounceResult {
  /** The peer id the server assigned to this connection. */
  id: string
  /** The current directory snapshot the server sees. */
  directory: PeerDescriptor[]
}

/**
 * `devtoolskit:internal:peer:announce`
 *
 * Called by each peer after its WS link is trusted. The peer declares its
 * role/capabilities/meta; the server updates its directory entry and
 * broadcasts a delta to all other peers. Returns the server-assigned peer
 * id and the current directory snapshot so the peer can initialise its
 * local replica.
 */
export const peerAnnounce = defineRpcFunction({
  name: 'devtoolskit:internal:peer:announce',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (input: PeerAnnounceInput): Promise<PeerAnnounceResult> => {
        const session = context.rpc.getCurrentRpcSession()
        const mesh = context.rpc._mesh
        const peerId = session?.meta.peerId
        if (!session || !peerId) {
          throw new Error('[peer:announce] Missing peer session — cannot announce without an active link')
        }

        const existing = mesh.directory.get(peerId)
        const descriptor: PeerDescriptor = {
          id: peerId,
          role: input.role,
          capabilities: input.capabilities ?? [],
          meta: {
            ...(existing?.meta ?? {}),
            ...(input.meta ?? {}),
          },
          links: existing?.links ?? [{ transport: 'ws', priority: 100 }],
        }

        mesh.directory.upsert(descriptor)

        // Also remember role on the session meta for quick access.
        session.meta.peerRole = input.role

        return {
          id: peerId,
          directory: mesh.directory.list(),
        }
      },
    }
  },
})
