import type { DevToolsChildProcessTerminalSession } from '../types/terminals'

// Strips ANSI escape sequences (colour codes, cursor moves, progress-bar
// repaints) so a digest line reads as plain text.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]/g

function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, '')
}

export interface LineDigest {
  /** The latest non-empty, ANSI-stripped line seen so far (empty until output arrives). */
  readonly latest: string
  /**
   * Feed a raw output chunk. Returns the latest line when it changed, else
   * `undefined` — so callers can skip a no-op `docks.update`.
   */
  push: (chunk: string) => string | undefined
}

/**
 * Track the latest "line of progress" from a stream of terminal output chunks.
 *
 * Chunks arrive arbitrarily split, and progress UIs repaint a single line with
 * a carriage return rather than a newline — so both `\n` and `\r` start a new
 * line, and the last non-empty segment (including a not-yet-terminated tail) is
 * the current line. ANSI escapes are stripped and trailing whitespace trimmed.
 *
 * Pair it with a launcher's `digest` field to surface a one-line status without
 * opening the Terminals dock:
 *
 * ```ts
 * const digest = createLineDigest()
 * session.getChildProcess()?.stdout?.on('data', (c) => {
 *   const line = digest.push(String(c))
 *   if (line) entry.update({ launcher: { ...launcher, digest: line } })
 * })
 * ```
 */
export function createLineDigest(): LineDigest {
  // Carries an unterminated tail between chunks so a line split across two
  // chunks resolves once its terminator (or the next segment) arrives.
  let pending = ''
  let latest = ''

  return {
    get latest() {
      return latest
    },
    push(chunk: string): string | undefined {
      const segments = (pending + chunk).split(/\r\n|\r|\n/)
      // The final segment is unterminated — keep it as the running tail.
      pending = segments.pop() ?? ''

      let next: string | undefined
      for (const segment of [...segments, pending]) {
        const line = stripAnsi(segment).trimEnd()
        if (line)
          next = line
      }

      if (next && next !== latest) {
        latest = next
        return latest
      }
      return undefined
    },
  }
}

/**
 * Attach a {@link createLineDigest} to a child-process terminal session's live
 * output, invoking `onLine` whenever the latest line changes. Returns a
 * detach function. A no-op when the session's child process is unavailable
 * (e.g. it already exited), so callers need not guard.
 *
 * The extra `data` listeners are additive — they don't consume output the
 * Terminals feed is already streaming.
 */
export function tailSessionDigest(
  session: DevToolsChildProcessTerminalSession,
  onLine: (line: string) => void,
): () => void {
  const digest = createLineDigest()
  const cp = session.getChildProcess?.()
  if (!cp)
    return () => {}

  const handler = (chunk: unknown): void => {
    const line = digest.push(String(chunk))
    if (line)
      onLine(line)
  }

  cp.stdout?.on('data', handler)
  cp.stderr?.on('data', handler)

  return () => {
    cp.stdout?.off('data', handler)
    cp.stderr?.off('data', handler)
  }
}
