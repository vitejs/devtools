/* eslint-disable no-console */
import * as p from '@clack/prompts'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import c from 'ansis'
import { abortPendingAuth, refreshTempAuthId, setPendingAuth } from '../../auth-state'
import { MARK_INFO } from '../../constants'
import { getInternalContext } from '../../context-internal'

export interface DevToolsAuthInput {
  authId: string
  ua: string
  origin: string
}

export interface DevToolsAuthReturn {
  isTrusted: boolean
}

const AUTH_TIMEOUT_MS = 60_000

export const anonymousAuth = defineRpcFunction({
  name: 'vite:anonymous:auth',
  type: 'action',
  setup: (context) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    return {
      handler: async (query: DevToolsAuthInput): Promise<DevToolsAuthReturn> => {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          throw new Error('Failed to retrieve the current RPC session')

        if (session.meta.isTrusted || storage.value().trusted[query.authId]) {
          session.meta.clientAuthId = query.authId
          session.meta.isTrusted = true
          return {
            isTrusted: true,
          }
        }

        // Auto-approve if authId matches a configured password
        const passwords = (context.viteConfig.devtools?.config as any)?.clientAuthPasswords as string[] ?? []
        if (passwords.includes(query.authId)) {
          storage.mutate((state) => {
            state.trusted[query.authId] = {
              authId: query.authId,
              ua: query.ua,
              origin: query.origin,
              timestamp: Date.now(),
            }
          })
          session.meta.clientAuthId = query.authId
          session.meta.isTrusted = true
          return {
            isTrusted: true,
          }
        }

        // Abort any existing pending auth request
        abortPendingAuth()

        // Generate a fresh temp ID for the auth URL
        const tempId = refreshTempAuthId()

        // Derive the server URL for the auth link
        const serverUrl = context.viteServer?.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
          ?? `http://localhost:${context.viteConfig.server.port}`
        const authUrl = `${serverUrl}/.devtools/auth?id=${encodeURIComponent(tempId)}`

        const message = [
          `A browser is requesting permissions to connect to the Vite DevTools.`,
          '',
          `User Agent: ${c.yellow(c.bold(query.ua || 'Unknown'))}`,
          `Origin    : ${c.cyan(c.bold(query.origin || 'Unknown'))}`,
          `Identifier: ${c.green(c.bold(query.authId))}`,
          '',
          `Auth URL  : ${c.cyan(c.underline(authUrl))}`,
          '',
          'This will allow the browser to interact with the server, make file changes and run commands.',
          c.red(c.bold('You should only trust your local development browsers.')),
        ]

        p.note(
          c.reset(message.join('\n')),
          c.bold(c.yellow(' Vite DevTools Permission Request ')),
        )

        // Set up abort controller for timeout and external cancellation
        const abortController = new AbortController()

        return new Promise<DevToolsAuthReturn>((resolve) => {
          const timeout = setTimeout(() => {
            abortController.abort()
            setPendingAuth(null)
            console.log(c.yellow`${MARK_INFO} Auth request timed out for ${c.bold(query.authId)}`)
            resolve({ isTrusted: false })
          }, AUTH_TIMEOUT_MS)

          // Register as pending auth so auth-verify endpoint can resolve it
          setPendingAuth({
            clientAuthId: query.authId,
            session,
            ua: query.ua,
            origin: query.origin,
            resolve,
            abortController,
            timeout,
          })

          // Show terminal confirm prompt with abort signal
          p.confirm({
            message: c.bold(`Do you trust this client (${c.green(c.bold(query.authId))})?`),
            initialValue: false,
            signal: abortController.signal,
          }).then((answer) => {
            // If already resolved by auth-verify, ignore
            clearTimeout(timeout)
            setPendingAuth(null)

            if (p.isCancel(answer)) {
              // Aborted by auth-verify or timeout — already handled
              return
            }

            if (answer) {
              storage.mutate((state) => {
                state.trusted[query.authId] = {
                  authId: query.authId,
                  ua: query.ua,
                  origin: query.origin,
                  timestamp: Date.now(),
                }
              })
              session.meta.clientAuthId = query.authId
              session.meta.isTrusted = true

              p.outro(c.green(c.bold(`You have granted permissions to ${c.bold(query.authId)}`)))
              resolve({ isTrusted: true })
            }
            else {
              p.outro(c.red(c.bold(`You have denied permissions to ${c.bold(query.authId)}`)))
              resolve({ isTrusted: false })
            }
          }).catch(() => {
            // Abort signal triggered — already handled by timeout or auth-verify
            clearTimeout(timeout)
            setPendingAuth(null)
          })
        })
      },
    }
  },
})
