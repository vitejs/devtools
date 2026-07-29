import { defineOxcRpc } from '../_define'
import { x } from 'tinyexec'
import { getVitePlusVersions, isVitePlusInstalled } from '../../utils/vite-plus'

type Package = {
  installed: boolean
  version: string | undefined
  latest: boolean
  npmxLink: string | undefined
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

        const res = await fetch('https://npm.antfu.dev/oxlint+oxfmt')
        const [oxlintData, oxfmtData] = await res.json()
        const vitePlus = isVitePlusInstalled(ctx.cwd)
        const vitePlusVersions = vitePlus ? await getVitePlusVersions(ctx.cwd) : undefined

        if (vitePlusVersions) {
          oxlint = {
            installed: true,
            version: vitePlusVersions.oxlint,
            latest: vitePlusVersions.oxlint === oxlintData.version,
            npmxLink: `https://npmx.dev/package/oxlint/v/${vitePlusVersions.oxlint}`,
          }
          oxfmt = {
            installed: true,
            version: vitePlusVersions.oxfmt,
            latest: vitePlusVersions.oxfmt === oxfmtData.version,
            npmxLink: `https://npmx.dev/package/oxfmt/v/${vitePlusVersions.oxfmt}`,
          }
        } else {
          try {
            const { stdout } = await x('oxlint', ['--version'], { nodeOptions: { cwd: ctx.cwd } })
            oxlint.installed = true
            oxlint.version = stdout.split(' ')[1]?.trim().replaceAll('\n', '') ?? undefined
            oxlint.latest = oxlint.version === oxlintData.version
            oxlint.npmxLink = `https://npmx.dev/package/oxlint/v/${oxlint.version}`
          } catch {
            oxlint.installed = false
          }
          try {
            const { stdout } = await x('oxfmt', ['--version'], { nodeOptions: { cwd: ctx.cwd } })
            oxfmt.installed = true
            oxfmt.version = stdout.split(' ')[1]?.trim().replaceAll('\n', '') ?? undefined
            oxfmt.latest = oxfmt.version === oxfmtData.version
            oxfmt.npmxLink = `https://npmx.dev/package/oxfmt/v/${oxfmt.version}`
          } catch {
            oxfmt.installed = false
          }
        }
        return {
          oxlint,
          oxfmt,
          vitePlus: vitePlusVersions?.vitePlus,
        }
      },
    }
  },
})
