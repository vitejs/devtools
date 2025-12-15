import * as p from '@clack/prompts'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import c from 'ansis'

export interface DevToolsAuthInput {
  authId: string
  ua: string
}

export interface DevToolsAuthReturn {
  isTrusted: boolean
}

const TEMPORARY_STORAGE = new Map<string, {
  authId: string
  ua: string
  timestamp: number
}>()

export const anonymousAuth = defineRpcFunction({
  name: 'vite:anonymous:auth',
  type: 'action',
  setup: () => {
    return {
      handler: async (query: DevToolsAuthInput): Promise<DevToolsAuthReturn> => {
        if (TEMPORARY_STORAGE.has(query.authId)) {
          return {
            isTrusted: true,
          }
        }

        const message = [
          `A browser is requesting permissions to connect to the Vite DevTools.`,

          `User Agent: ${c.yellow(c.bold(query.ua || 'Unknown'))}`,
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
          p.outro(c.green(c.bold('You have granted permissions to this client.')))

          return {
            isTrusted: true,
          }
        }

        p.outro(c.red(c.bold('You have denied permissions to this client.')))
        return {
          isTrusted: false,
        }
      },
    }
  },
})
