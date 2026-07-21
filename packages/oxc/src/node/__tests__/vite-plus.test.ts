import { describe, expect, it } from 'vitest'
import { parseVitePlusVersions } from '../utils/vite-plus'

describe('parseVitePlusVersions', () => {
  it('reads the bundled Oxc tool versions from vp -V output', () => {
    const output = `VITE+ - The Unified Toolchain for the Web\r
\r
Tools:\r
  vite     v8.1.3\r
  oxfmt    v0.57.0\r
  oxlint   v1.72.0\r
  tsdown   v0.22.3\r
\r
Environment:\r
  oxfmt    v9.0.0\r
  oxlint   v9.0.0\r
`

    expect(parseVitePlusVersions(output)).toEqual({
      oxfmt: '0.57.0',
      oxlint: '1.72.0',
    })
  })
})
