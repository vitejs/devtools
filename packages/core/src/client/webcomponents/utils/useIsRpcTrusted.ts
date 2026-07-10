import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { onScopeDispose, ref } from 'vue'

/**
 * Track the RPC client's trust flag as a reactive ref, seeded from the current
 * value and kept in sync via `rpc:is-trusted:updated`.
 *
 * The subscription is torn down with the owning effect scope, so remounting a
 * dock shell (as Storybook and tests do) never leaks listeners onto the shared
 * RPC client. Pass `onChange` to react to transitions (e.g. close the panel on
 * revocation).
 */
export function useIsRpcTrusted(
  context: Pick<DocksContext, 'rpc'>,
  onChange?: (isTrusted: boolean) => void,
): Ref<boolean | null> {
  const isTrusted = ref<boolean | null>(context.rpc.isTrusted)
  const off = context.rpc.events.on('rpc:is-trusted:updated', (value) => {
    isTrusted.value = value
    onChange?.(value)
  })
  onScopeDispose(() => off())
  return isTrusted
}
