import type { PeerId, PeerRole, PeerRolePattern } from '@vitejs/devtools-rpc/peer'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface MeshRelayInput {
  /** Target peer id, role, or role pattern. First match wins. */
  to: PeerId | PeerRole | PeerRolePattern
  /** RPC function name to invoke on the target. */
  method: string
  /** Arguments to pass. */
  args: unknown[]
}

/**
 * `devtoolskit:internal:mesh:relay`
 *
 * Forwards an RPC call from one peer to another through the server. The
 * sender must be trusted (enforced by the RPC resolver on non-anonymous
 * methods). The server resolves `to` against the directory, picks a link
 * to the target, forwards the call, and returns the reply.
 *
 * Origin identity is not yet signed across relay — that lands in Phase 5.
 * For now, relayed calls appear to the target as if sent from the server.
 */
export const meshRelay = defineRpcFunction({
  name: 'devtoolskit:internal:mesh:relay',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (input: MeshRelayInput): Promise<unknown> => {
        const mesh = context.rpc._mesh
        const matches = mesh.directory.resolve(input.to).filter(p => p.id !== mesh.self.id)
        const target = matches[0]
        if (!target) {
          throw new Error(`[mesh:relay] No peer matching target ${JSON.stringify(input.to)}`)
        }
        const link = mesh.links.pick(target.id)
        if (!link) {
          throw new Error(`[mesh:relay] No link available to peer ${target.id}`)
        }
        return await (link.rpc as any).$call(input.method, ...input.args)
      },
    }
  },
})
