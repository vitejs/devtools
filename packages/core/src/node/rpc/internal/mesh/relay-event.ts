import type { MeshRelayInput } from './relay'
import { defineRpcFunction } from '@vitejs/devtools-kit'

/**
 * `devtoolskit:internal:mesh:relay-event`
 *
 * Fire-and-forget variant of {@link meshRelay}. Resolves immediately; the
 * target's handler (if any) runs without an awaited reply.
 */
export const meshRelayEvent = defineRpcFunction({
  name: 'devtoolskit:internal:mesh:relay-event',
  type: 'event',
  setup: (context) => {
    return {
      handler: (input: MeshRelayInput): void => {
        const mesh = context.rpc._mesh
        const matches = mesh.directory.resolve(input.to).filter(p => p.id !== mesh.self.id)
        const target = matches[0]
        if (!target)
          return
        const link = mesh.links.pick(target.id)
        if (!link) {
          return
        }
        ;(link.rpc as any).$callEvent(input.method, ...input.args)
      },
    }
  },
})
