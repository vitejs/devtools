import fs from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../events-reader'
import { RolldownLogsManager } from '../logs-manager'

it.each(['loadSession', 'loadSessionSummary', 'loadPackageSession'] as const)(
  '%s retains a large session across metadata reads and repeated requests',
  async (method) => {
    const dir = await mkdtemp(join(tmpdir(), 'rolldown-reader-cache-'))
    const readers = new Set<RolldownEventsReader>()
    const stat = fs.promises.stat.bind(fs.promises)
    const get = RolldownEventsReader.get.bind(RolldownEventsReader)
    vi.spyOn(RolldownEventsReader, 'get').mockImplementation((...args) => {
      const reader = get(...args)
      readers.add(reader)
      return reader
    })
    // Exercise the real file readers without allocating a multi-GiB fixture.
    vi.spyOn(fs.promises, 'stat').mockImplementation(async (...args) => {
      const result = await stat(...args)
      if (result && String(args[0]).endsWith('/logs.json'))
        result.size = 300 * 1024 * 1024
      return result
    })
    try {
      for (const session of ['first', 'second']) {
        await mkdir(join(dir, session))
        await writeFile(join(dir, session, 'logs.json'), `${JSON.stringify({ action: 'BuildStart', timestamp: '1772529438599', session_id: session })}\n`)
        await writeFile(join(dir, session, 'meta.json'), `${JSON.stringify({ action: 'SessionMeta', timestamp: '1772529438599', session_id: session })}\n`)
      }
      const manager = new RolldownLogsManager(dir)
      const first = await manager[method]('first')
      const filepath = join(dir, 'first', 'logs.json')
      const key = method === 'loadPackageSession' ? `${filepath}:package-summary` : filepath
      expect(first.meta).toMatchObject({ session_id: 'first' })
      expect(RolldownEventsReader.peek(filepath, key)).toBe(first)
      expect(await manager[method]('first')).toBe(first)

      const second = await manager[method]('second')
      expect(second.meta).toMatchObject({ session_id: 'second' })
      expect(RolldownEventsReader.peek(filepath, key)).toBeUndefined()
      expect(await manager[method]('second')).toBe(second)
    }
    finally {
      for (const reader of readers)
        reader.dispose()
      vi.restoreAllMocks()
      await rm(dir, { recursive: true, force: true })
    }
  },
)
