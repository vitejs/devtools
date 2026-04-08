/* eslint-disable no-console */
import process from 'node:process'
import * as p from '@clack/prompts'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import c from 'ansis'
import { abortPendingAuth, getTempAuthToken, refreshTempAuthToken, setPendingAuth } from '../../auth-state'
import { MARK_INFO } from '../../constants'
import { getInternalContext } from '../../context-internal'

export interface DevToolsAuthInput {
  authToken: string
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

        if (session.meta.isTrusted || storage.value().trusted[query.authToken]) {
          session.meta.clientAuthToken = query.authToken
          session.meta.isTrusted = true
          return {
            isTrusted: true,
          }
        }

        // Auto-approve if authToken matches a configured auth token (session-only, not persisted)
        const tokens = context.viteConfig.devtools?.config?.clientAuthTokens ?? []
        if (tokens.includes(query.authToken)) {
          session.meta.clientAuthToken = query.authToken
          session.meta.isTrusted = true
          return {
            isTrusted: true,
          }
        }

        // Auto-approve if authToken matches the server-generated temp auth token
        if (query.authToken === getTempAuthToken()) {
          storage.mutate((state) => {
            state.trusted[query.authToken] = {
              authToken: query.authToken,
              ua: query.ua,
              origin: query.origin,
              timestamp: Date.now(),
            }
          })
          session.meta.clientAuthToken = query.authToken
          session.meta.isTrusted = true
          refreshTempAuthToken()
          return {
            isTrusted: true,
          }
        }

        // Abort any existing pending auth request
        abortPendingAuth()

        // Generate a fresh temp ID for the auth URL
        const tempId = getTempAuthToken()

        // Derive the server URL for the auth link
        const serverUrl = context.viteServer?.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
          ?? `http://localhost:${context.viteConfig.server.port}`
        const authUrl = `${serverUrl}/.devtools/auth?id=${encodeURIComponent(tempId)}`

        const message = [
          `A browser is requesting permissions to connect to the Vite DevTools.`,
          '',
          `User Agent   : ${c.yellow(c.bold(query.ua || 'Unknown'))}`,
          `Origin       : ${c.yellow(c.bold(query.origin || 'Unknown'))}`,
          `Client Token : ${c.green(c.bold(query.authToken))}`,
          '',
          `Manual Auth URL   : ${c.cyan(c.underline(authUrl))}`,
          `Manual Auth Token : ${c.cyan(c.bold(tempId))}`,
          '',
          'This will allow the browser to interact with the server, make file changes and run commands.',
          c.red(c.bold('You should only trust your local development browsers.')),
        ]

        p.note(
          c.reset(message.join('\n')),
          c.bold(c.yellow(' Vite DevTools Permission Request ')),
        )

        // if non-TTY, skip the prompt
        if (!process.stdout.isTTY) {
          return {
            isTrusted: false,
          }
        }

        // Set up abort controller for timeout and external cancellation
        const abortController = new AbortController()

        return new Promise<DevToolsAuthReturn>((resolve) => {
          const timeout = setTimeout(() => {
            abortController.abort()
            setPendingAuth(null)
            console.log(c.yellow`${MARK_INFO} Auth request timed out for ${c.bold(query.authToken)}`)
            resolve({ isTrusted: false })
          }, AUTH_TIMEOUT_MS)

          // Register as pending auth so auth-verify endpoint can resolve it
          setPendingAuth({
            clientAuthToken: query.authToken,
            session,
            ua: query.ua,
            origin: query.origin,
            resolve,
            abortController,
            timeout,
          })

          // Show terminal confirm prompt with abort signal
          p.confirm({
            message: c.bold(`Do you trust this client (${c.green(c.bold(query.authToken))})?`),
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
                state.trusted[query.authToken] = {
                  authToken: query.authToken,
                  ua: query.ua,
                  origin: query.origin,
                  timestamp: Date.now(),
                }
              })
              session.meta.clientAuthToken = query.authToken
              session.meta.isTrusted = true

              p.outro(c.green(c.bold(`You have granted permissions to ${c.bold(query.authToken)}`)))
              resolve({ isTrusted: true })
            }
            else {
              p.outro(c.red(c.bold(`You have denied permissions to ${c.bold(query.authToken)}`)))
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
