import * as p from '@clack/prompts'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import c from 'ansis'

export interface DevToolsAuthInput {
  authId: string
  ua: string
  origin: string
}

export interface DevToolsAuthReturn {
  isTrusted: boolean
}

// TODO: Replace with a proper storage solution
const TEMPORARY_STORAGE = new Map<string, {
  authId: string
  ua: string
  timestamp: number
}>()

export const anonymousAuth = defineRpcFunction({
  name: 'vite:anonymous:auth',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (query: DevToolsAuthInput): Promise<DevToolsAuthReturn> => {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          throw new Error('Failed to retrieve the current RPC session')

        if (TEMPORARY_STORAGE.has(query.authId)) {
          session.meta.clientAuthId = query.authId
          session.meta.isTrusted = true
          return {
            isTrusted: true,
          }
        }

        const message = [
          `A browser is requesting permissions to connect to the Vite DevTools.`,
          '',
          `User Agent: ${c.yellow(c.bold(query.ua || 'Unknown'))}`,
          `Origin    : ${c.cyan(c.bold(query.origin || 'Unknown'))}`,
          `Identifier: ${c.green(c.bold(query.authId))}`,
          '',
          'This will allow the browser to interact with the server, make file changes and run commands.',
          c.red(c.bold('You should only trust your local development browsers.')),
        ]

        p.note(
          c.reset(message.join('\n')),
          c.bold(c.yellow(' Vite DevTools Permission Request ')),
        )

        const answer = await p.confirm({
          message: c.bold(`Do you trust this client (${c.green(c.bold(query.authId))})?`),
          initialValue: false,
        })

        if (answer) {
          TEMPORARY_STORAGE.set(query.authId, {
            authId: query.authId,
            ua: query.ua,
            timestamp: Date.now(),
          })
          session.meta.clientAuthId = query.authId
          session.meta.isTrusted = true

          p.outro(c.green(c.bold(`You have granted permissions to ${c.bold(query.authId)}`)))
          return {
            isTrusted: true,
          }
        }

        p.outro(c.red(c.bold(`You have denied permissions to ${c.bold(query.authId)}`)))
        return {
          isTrusted: false,
        }
      },
    }
  },
})
