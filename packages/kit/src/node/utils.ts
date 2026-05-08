import type { ClientScriptEntry } from '../types/docks'
import { toDataURL } from 'mlly'

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
