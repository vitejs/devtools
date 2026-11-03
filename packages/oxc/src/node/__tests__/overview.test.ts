import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLatestVersions, overview } from '../rpc/functions/overview'

vi.mock('@vitejs/devtools-kit/node', () => ({ isVitePlusInstalled: () => true }))
vi.mock('../utils/vite-plus', () => ({
  getVitePlusVersions: async () => ({ vitePlus: '0.2.4', oxlint: '1.72.0', oxfmt: '0.57.0' }),
}))
vi.mock('../rpc/functions/oxlint-setup', () => ({ needsOxlintMigration: () => false }))

const fetchMock = vi.fn<typeof fetch>()

function runOverview() {
  const setup = overview.setup!({ cwd: '/project' } as any)
  return setup.handler!()
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('fetchLatestVersions', () => {
  it('returns the latest published versions', async () => {
    fetchMock.mockResolvedValue(Response.json([{ version: '1.72.0' }, { version: '0.58.0' }]))

    await expect(fetchLatestVersions()).resolves.toEqual({ oxlint: '1.72.0', oxfmt: '0.58.0' })
  })

  it('returns unknown versions when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(fetchLatestVersions()).resolves.toEqual({ oxlint: undefined, oxfmt: undefined })
  })

  it('returns unknown versions on a non-OK response', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    await expect(fetchLatestVersions()).resolves.toEqual({ oxlint: undefined, oxfmt: undefined })
  })
})

describe('overview', () => {
  it('compares local versions with the latest versions', async () => {
    fetchMock.mockResolvedValue(Response.json([{ version: '1.72.0' }, { version: '0.58.0' }]))

    const result = await runOverview()

    expect(result.oxlint).toMatchObject({ installed: true, version: '1.72.0', latest: true })
    expect(result.oxfmt).toMatchObject({ installed: true, version: '0.57.0', latest: false })
  })

  it('still reports local versions when the latest versions are unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const result = await runOverview()

    expect(result).toMatchObject({
      oxlint: { installed: true, version: '1.72.0', latest: undefined },
      oxfmt: { installed: true, version: '0.57.0', latest: undefined },
      vitePlus: '0.2.4',
    })
  })
})
