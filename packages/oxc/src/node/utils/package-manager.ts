import type { Agent, Command } from 'package-manager-detector'
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'

/** Detect the project's package manager agent, falling back to npm. */
export async function detectAgent(root: string): Promise<Agent> {
  return (await detect({ cwd: root }))?.agent ?? 'npm'
}

/**
 * Resolve a package-manager command to a single command-line string, e.g.
 * `pnpm add -D oxfmt@latest` or `pnpm dlx oxfmt --init`. Every supported agent
 * defines `add`/`execute`, so this always resolves.
 */
export function commandLine(agent: Agent, command: Command, args: string[]): string {
  const { command: bin, args: rest } = resolveCommand(agent, command, args)!
  return [bin, ...rest].join(' ')
}
