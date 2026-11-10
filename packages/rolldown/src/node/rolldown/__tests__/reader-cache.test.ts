import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'
import { RolldownEventsReader } from '../events-reader'
import { RolldownLogsManager } from '../logs-manager'

describe('rolldown reader cache', () => {
  it('lists many sessions without evicting a loaded one', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rolldown-reader-cache-'))
    const base = { build_id: 'bid_1', session_id: 'sid_1' }
    const meta = JSON.stringify({ timestamp: 1, action: 'SessionMeta', inputs: [], plugins: [], cwd: '/', platform: 'node', format: 'esm', dir: 'dist', file: null, ...base })
    try {
      for (let index = 0; index < 40; index++) {
        mkdirSync(join(dir, `s${index}`))
        writeFileSync(join(dir, `s${index}`, 'meta.json'), `${meta}\n`)
      }
      mkdirSync(join(dir, 'real'))
      writeFileSync(join(dir, 'real', 'meta.json'), `${meta}\n`)
      writeFileSync(join(dir, 'real', 'logs.json'), `${JSON.stringify({ timestamp: 2, action: 'BuildStart', ...base })}\n`)

      const manager = new RolldownLogsManager(dir)
      const loaded = await manager.loadSession('real')
      const sessions = await manager.list()

      expect(sessions).toHaveLength(41)
      // Same id the events reader gives the first event of a file.
      expect(sessions[0]!.meta).toMatchObject({ action: 'SessionMeta', event_id: '1#0' })
      expect(RolldownEventsReader.peek(join(dir, 'real', 'logs.json'))).toBe(loaded)
      loaded.dispose()
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('evicts large readers over the memory budget but keeps recent and busy ones', () => {
    const create = (name: string, bytes: number, busy = false) => {
      const reader = RolldownEventsReader.get(`/reader-cache/${name}/logs.json`)
      Object.defineProperty(reader, 'estimateLogBytes', { value: () => bytes })
      Object.defineProperty(reader, 'hasPendingRead', { value: () => busy })
      return reader
    }
    const GiB = 1024 ** 3
    const readers = [create('a', 1.5 * GiB), create('b', 1.5 * GiB, true), create('c', 1.5 * GiB), create('d', 1.5 * GiB)]
    try {
      // Getting another reader prunes: the oldest idle readers go until the budget fits or only protected ones remain.
      readers.push(create('e', 0))
      const loaded = ['a', 'b', 'c', 'd', 'e'].filter(name => RolldownEventsReader.peek(`/reader-cache/${name}/logs.json`))
      expect(loaded).toEqual(['b', 'd', 'e'])
    }
    finally {
      for (const reader of readers)
        reader.dispose()
    }
  })
})
