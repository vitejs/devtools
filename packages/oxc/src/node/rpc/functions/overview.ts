import { isVitePlusInstalled } from '@vitejs/devtools-kit/node'
import { defineOxcRpc } from '../_define'
import { x } from 'tinyexec'
import { getVitePlusVersions } from '../../utils/vite-plus'
import { needsOxlintMigration } from './oxlint-setup'

type Package = {
  installed: boolean
  version: string | undefined
  /** `undefined` when the latest version could not be determined. */
  latest: boolean | undefined
  npmxLink: string | undefined
}

type LatestVersions = {
  oxlint: string | undefined
  oxfmt: string | undefined
}

const LATEST_VERSIONS_URL = 'https://npm.antfu.dev/oxlint+oxfmt'
const LATEST_VERSIONS_TIMEOUT = 5000

/**
 * Best-effort lookup of the latest published Oxlint / Oxfmt versions.
 * Resolves to `undefined` versions when the registry is unreachable so the
 * overview can still render local toolchain info.
 */
export async function fetchLatestVersions(): Promise<LatestVersions> {
  try {
    const res = await fetch(LATEST_VERSIONS_URL, {
      signal: AbortSignal.timeout(LATEST_VERSIONS_TIMEOUT),
    })
    if (!res.ok) return { oxlint: undefined, oxfmt: undefined }
    const data = await res.json()
    const [oxlintData, oxfmtData] = Array.isArray(data) ? data : []
    return {
      oxlint: typeof oxlintData?.version === 'string' ? oxlintData.version : undefined,
      oxfmt: typeof oxfmtData?.version === 'string' ? oxfmtData.version : undefined,
    }
  } catch {
    return { oxlint: undefined, oxfmt: undefined }
  }
}

function isLatest(version: string | undefined, latestVersion: string | undefined) {
  return version && latestVersion ? version === latestVersion : undefined
}

export const overview = defineOxcRpc({
  name: 'devtools-oxc:overview',
  type: 'query',
  jsonSerializable: true,
  setup: ctx => {
    return {
      handler: async () => {
        let oxlint: Package = {
          installed: false,
          latest: true,
          version: undefined,
          npmxLink: undefined,
        }
        let oxfmt: Package = {
          installed: false,
          latest: true,
          version: undefined,
          npmxLink: undefined,
        }

        const latestVersions = await fetchLatestVersions()
        const vitePlus = isVitePlusInstalled(ctx.cwd)
        const vitePlusVersions = vitePlus ? await getVitePlusVersions(ctx.cwd) : undefined

        if (vitePlusVersions) {
          oxlint = {
            installed: true,
            version: vitePlusVersions.oxlint,
            latest: isLatest(vitePlusVersions.oxlint, latestVersions.oxlint),
            npmxLink: `https://npmx.dev/package/oxlint/v/${vitePlusVersions.oxlint}`,
          }
          oxfmt = {
            installed: true,
            version: vitePlusVersions.oxfmt,
            latest: isLatest(vitePlusVersions.oxfmt, latestVersions.oxfmt),
            npmxLink: `https://npmx.dev/package/oxfmt/v/${vitePlusVersions.oxfmt}`,
          }
        } else {
          try {
            const { stdout } = await x('oxlint', ['--version'], { nodeOptions: { cwd: ctx.cwd } })
            if (!stdout) {
              throw new Error('Not installed')
            }
            oxlint.installed = true
            oxlint.version = stdout.split(' ')[1]?.trim().replaceAll('\n', '') ?? undefined
            oxlint.latest = isLatest(oxlint.version, latestVersions.oxlint)
            oxlint.npmxLink = `https://npmx.dev/package/oxlint/v/${oxlint.version}`
          } catch {
            oxlint.installed = false
          }
          try {
            const { stdout } = await x('oxfmt', ['--version'], { nodeOptions: { cwd: ctx.cwd } })
            if (!stdout) {
              throw new Error('Not installed')
            }
            oxfmt.installed = true
            oxfmt.version = stdout.split(' ')[1]?.trim().replaceAll('\n', '') ?? undefined
            oxfmt.latest = isLatest(oxfmt.version, latestVersions.oxfmt)
            oxfmt.npmxLink = `https://npmx.dev/package/oxfmt/v/${oxfmt.version}`
          } catch {
            oxfmt.installed = false
          }
        }
        return {
          oxlint,
          oxfmt,
          vitePlus: vitePlusVersions?.vitePlus,
          needsOxlintMigration: needsOxlintMigration(ctx.cwd),
        }
      },
    }
  },
})
