import { isPackageExists } from 'local-pkg'
import { x } from 'tinyexec'

export function isVitePlusInstalled(cwd: string) {
  return isPackageExists('vite-plus', { paths: [cwd] })
}

export function parseVitePlusVersions(output: string) {
  const vitePlus = /^\s*vite-plus\s+v(\S+)\s*$/m.exec(output)?.[1]
  const tools = output
    .split(/^[ \t]*Tools:[ \t\r]*$/m)[1]
    ?.split(/^[ \t]*Environment:[ \t\r]*$/m)[0]
  if (!vitePlus || !tools) return undefined

  const versions = new Map(
    [...tools.matchAll(/^\s*(oxfmt|oxlint)\s+v(\S+)\s*$/gm)].map(([, tool, version]) => [
      tool,
      version,
    ]),
  )
  const oxfmt = versions.get('oxfmt')
  const oxlint = versions.get('oxlint')
  return oxfmt && oxlint ? { vitePlus, oxfmt, oxlint } : undefined
}

export async function getVitePlusVersions(cwd: string) {
  try {
    const result = await x('vp', ['-V'], {
      nodeOptions: {
        cwd,
        env: { NO_COLOR: '1', FORCE_COLOR: undefined },
      },
    })
    return result.exitCode === 0 ? parseVitePlusVersions(result.stdout) : undefined
  } catch {
    return undefined
  }
}
