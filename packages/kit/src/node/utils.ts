import type { ClientScriptEntry } from '../types/docks'
import { Buffer } from 'node:buffer'

function toDataURL(code: string) {
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}

/**
 * Create a quick `ClientScriptEntry` from an inline function or
 * stringified code. Useful for prototyping `action` / `renderer`
 * dock entries without setting up a separate importable module.
 *
 * @experimental Prefer a proper importable module for production use.
 */
export function createSimpleClientScript(fn: string | ((ctx: any) => void)): ClientScriptEntry {
  const code = `const fn = ${fn.toString()}; export default fn`
  return {
    importFrom: toDataURL(code),
    importName: 'default',
  }
}
