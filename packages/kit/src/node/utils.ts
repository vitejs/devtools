import type { ClientScriptEntry } from '../types/docks'
import { Buffer } from 'node:buffer'
import { isPackageExists } from 'local-pkg'

/** Detect Vite+ from the project directory when selecting its toolchain commands. */
export function isVitePlusInstalled(cwd: string): boolean {
  return isPackageExists('vite-plus', { paths: [cwd] })
}

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
