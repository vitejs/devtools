import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describePackagesApiSnapshots } from 'tsnapi/vitest'

describePackagesApiSnapshots({
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  filter(ctx) {
    if (!ctx.packageName.startsWith('@vitejs/'))
      return false
    const pkg = JSON.parse(
      readFileSync(`${ctx.packageRoot}/package.json`, 'utf8'),
    )
    if (!pkg.name || pkg.private)
      return false
  },
})
