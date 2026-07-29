import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { findDynamicImports, findExports, findStaticImports } from 'mlly'

interface ForbiddenRule {
  name: string
  match: (specifier: string) => boolean
}

const FORBIDDEN: ForbiddenRule[] = [
  { name: 'ws', match: id => id === 'ws' || id.startsWith('ws/') },
  { name: 'h3', match: id => id === 'h3' || id.startsWith('h3/') },
  { name: 'node:* builtin', match: id => id.startsWith('node:') },
  { name: 'devframe/rpc/transports/*', match: id => id.startsWith('devframe/rpc/transports/') },
  { name: 'devframe/node*', match: id => id === 'devframe/node' || id.startsWith('devframe/node/') },
]

interface ScannedSpecifiers {
  static: string[]
  dynamic: string[]
}

interface Violation {
  file: string
  specifier: string
  rule: string
}

async function scanSpecifiers(file: string): Promise<ScannedSpecifiers> {
  const code = await readFile(file, 'utf8')
  const staticIds = new Set<string>()
  for (const i of findStaticImports(code))
    staticIds.add(i.specifier)
  for (const e of findExports(code)) {
    if (e.specifier)
      staticIds.add(e.specifier)
  }
  const dynamicIds = new Set<string>()
  for (const d of findDynamicImports(code)) {
    // Only consider plain string expressions; ignore variable/template imports.
    const match = d.expression.match(/^\s*['"]([^'"]+)['"]\s*$/)
    if (match?.[1])
      dynamicIds.add(match[1])
  }
  return { static: [...staticIds], dynamic: [...dynamicIds] }
}

export interface CheckClientDistOptions {
  /** Absolute paths to the client entry chunks to walk from. */
  entries: string[]
  /** Used to build relative paths in error messages. */
  cwd: string
}

export async function checkClientDist(options: CheckClientDistOptions): Promise<void> {
  const { entries, cwd } = options
  const visited = new Set<string>()
  const violations: Violation[] = []

  async function visit(file: string): Promise<void> {
    if (visited.has(file))
      return
    visited.add(file)

    let scanned: ScannedSpecifiers
    try {
      scanned = await scanSpecifiers(file)
    }
    catch (err) {
      throw new Error(`[check-client-dist] Failed to read ${relative(cwd, file)}: ${(err as Error).message}`)
    }

    // Static imports load eagerly when the file is evaluated — they're the leak
    // vector this guard exists to catch. Flag any forbidden specifier.
    for (const id of scanned.static) {
      const hit = FORBIDDEN.find(r => r.match(id))
      if (hit)
        violations.push({ file, specifier: id, rule: hit.name })
    }

    // Follow both static and dynamic relative imports to discover every chunk
    // the browser can end up loading. Dynamic specifiers themselves aren't
    // checked against FORBIDDEN — the chunk they target is, on visit.
    for (const id of [...scanned.static, ...scanned.dynamic]) {
      if (id.startsWith('./') || id.startsWith('../')) {
        const next = resolve(dirname(file), id)
        await visit(next)
      }
    }
  }

  for (const entry of entries)
    await visit(entry)

  if (violations.length > 0) {
    const lines: string[] = ['[check-client-dist] Forbidden server-only imports found in client dist:', '']
    for (const v of violations) {
      lines.push(`  ${relative(cwd, v.file)}`)
      lines.push(`    imports ${JSON.stringify(v.specifier)} (matches forbidden rule: ${v.rule})`)
    }
    lines.push('')
    lines.push(`Scanned ${visited.size} chunks reachable from ${entries.length} client entries.`)
    lines.push('Client chunks must not statically import server-only modules — see packages/core/tsdown.config.ts.')
    throw new Error(lines.join('\n'))
  }

  console.log(`[check-client-dist] OK — scanned ${visited.size} chunks reachable from ${entries.length} client entries`)
}
