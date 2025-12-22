import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'
import yaml from 'yaml'

describe('exports-snapshot', async () => {
  const packages: { name: string, path: string, private?: boolean }[] = JSON.parse(
    await x('pnpm', ['ls', '--only-projects', '-r', '--json']).then(r => r.stdout),
  )

  for (const pkg of packages) {
    if (pkg.private)
      continue
    it(`${pkg.name}`, async () => {
      const manifest = await getPackageExportsManifest({
        importMode: 'dist',
        cwd: pkg.path,
        shouldIgnoreEntry({ entry }) {
          if (entry === './cli' || entry.startsWith('./client/'))
            return true
          return false
        },
      })
      await expect(yaml.stringify(manifest.exports))
        .toMatchFileSnapshot(`./exports/${pkg.name}.yaml`)
    })
  }
})
