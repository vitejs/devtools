/**
 * Reserved for `@vitejs/devtools-kit` and other first-party adapters
 * that reach into devframe's private machinery (currently the
 * remote-dock token bridge required by the relocated `DocksHost`).
 *
 * End users should not import from this subpath. The surface is
 * unstable and may change without a major bump.
 *
 * @internal
 */

export {
  normalizeBasePath,
  resolveBasePath,
} from '../../adapters/_shared'

export {
  getInternalContext,
  internalContextMap,
} from './context'

export type {
  DevToolsInternalContext,
  InternalAnonymousAuthStorage,
  RemoteTokenRecord,
} from './context'
