import { colors as c } from 'devframe/utils/colors'

export const MARK_CHECK: string = c.green('✔')
export const MARK_INFO: string = c.blue('ℹ')
export const MARK_ERROR: string = c.red('✖')
export const MARK_NODE: string = '⬢'

/**
 * Client-module resolution template declared when a live Vite dev server backs
 * the requests: bare-specifier dock client scripts load through Vite's own
 * `/@id/` resolution.
 */
export const DEVTOOLS_CLIENT_MODULE_RESOLUTION = '/@id/{specifier}'
