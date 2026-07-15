import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { BuildInfo, RolldownLogsManager } from '../rolldown/logs-manager'
import type { AnalysisReport } from './types'
import { getLogsManager } from '../rpc/utils'
import { createEmptyReport, createSessionNotFoundReport } from './utils'

export interface ResolvedSession {
  id?: string
  info?: BuildInfo
  sessions: BuildInfo[]
  report?: AnalysisReport
}

export interface AgentAnalysisContext {
  manager: RolldownLogsManager
  listSessions: () => Promise<BuildInfo[]>
  resolveSession: (tool: string, requested?: string) => Promise<ResolvedSession>
}

export function createAnalysisContext(context: ViteDevToolsNodeContext): AgentAnalysisContext {
  const manager = getLogsManager(context)

  async function listSessions() {
    const sessions = await manager.list()
    return sessions.toSorted((a, b) => b.timestamp - a.timestamp)
  }

  async function resolveSession(tool: string, requested?: string): Promise<ResolvedSession> {
    const sessions = await listSessions()
    const id = !requested || requested === 'latest'
      ? sessions[0]?.id
      : requested

    if (!id) {
      return {
        sessions,
        report: createEmptyReport(tool, 'No Rolldown sessions were found.', [
          'Run a build with Rolldown devtools output enabled before using this tool.',
        ]),
      }
    }

    const info = sessions.find(session => session.id === id)
    if (!info && requested && requested !== 'latest') {
      return {
        id,
        sessions,
        report: createSessionNotFoundReport(tool, id, sessions),
      }
    }

    return { id, info, sessions }
  }

  return {
    manager,
    listSessions,
    resolveSession,
  }
}
