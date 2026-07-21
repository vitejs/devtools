import { isPackageExists } from 'local-pkg'
import { x } from 'tinyexec'

export function isVitePlusInstalled(cwd: string) {
  return isPackageExists('vite-plus', { paths: [cwd] })
}

export function parseVitePlusVersions(output: string) {
  const tools = output
    .split(/^[ \t]*Tools:[ \t\r]*$/m)[1]
    ?.split(/^[ \t]*Environment:[ \t\r]*$/m)[0]
  if (!tools) return undefined

  const versions: Partial<Record<'oxfmt' | 'oxlint', string>> = {}
  for (const [, tool, version] of tools.matchAll(/^\s*(oxfmt|oxlint)\s+v(\S+)\s*$/gm)) {
    versions[tool as 'oxfmt' | 'oxlint'] = version
  }
  return versions.oxfmt && versions.oxlint
    ? { oxfmt: versions.oxfmt, oxlint: versions.oxlint }
    : undefined
}

export async function getVitePlusVersions(cwd: string) {
  try {
    const result = await x('vp', ['-V'], { nodeOptions: { cwd } })
    return result.exitCode === 0 ? parseVitePlusVersions(result.stdout) : undefined
  } catch {
    return undefined
  }
}
