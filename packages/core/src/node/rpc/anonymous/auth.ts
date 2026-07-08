/* eslint-disable no-console */
import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { buildOtpAuthUrl, exchangeTempAuthCode, getTempAuthCode, refreshTempAuthCode, verifyAuthToken } from 'devframe/node/auth'
import { getInternalContext } from 'devframe/node/hub-internals'
import { colors as c } from 'devframe/utils/colors'
import { MARK_INFO } from '../../constants'

export interface DevToolsAuthInput {
  authToken: string
  ua: string
  origin: string
}

export interface DevToolsAuthExchangeInput {
  code: string
  ua: string
  origin: string
}

// Print the one-time code + magic link once per code so reconnect loops don't
// spam the terminal. devframe stays headless — the host prints its own banner.
let lastPromptedCode: string | undefined

function promptForAuth(context: ViteDevToolsNodeContext, input: { authToken?: string, ua?: string, origin?: string }): void {
  const code = getTempAuthCode()
  if (code === lastPromptedCode)
    return
  lastPromptedCode = code

  const serverUrl = context.viteServer?.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
    ?? `http://localhost:${context.viteConfig.server.port}`
  const magicLink = buildOtpAuthUrl(serverUrl, code)

  const message = [
    c.yellow(c.bold(' Vite DevTools Permission Request ')),
    '',
    `A browser is requesting permission to connect to the Vite DevTools.`,
    '',
    `User Agent : ${c.yellow(c.bold(input.ua || 'Unknown'))}`,
    `Origin     : ${c.yellow(c.bold(input.origin || 'Unknown'))}`,
    '',
    `Auth Code  : ${c.green(c.bold(code))}`,
    `Magic Link : ${c.cyan(c.underline(magicLink))}`,
    '',
    'Enter the code in the browser, or open the magic link to authorize.',
    c.red(c.bold('You should only trust your local development browsers.')),
  ]
  console.log(c.reset(message.join('\n')))
}

/**
 * `devframe:anonymous:auth` — the connect-time handshake. A client presenting a
 * previously-issued bearer token (or a configured static token) is trusted
 * without re-entering the code; otherwise we surface the one-time code + magic
 * link and leave the client untrusted until it exchanges the code.
 */
export const anonymousAuth = defineRpcFunction({
  name: 'devframe:anonymous:auth',
  type: 'action',
  jsonSerializable: true,
  setup: (context: ViteDevToolsNodeContext) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    // Seed a fresh code for this server's auth flow.
    refreshTempAuthCode()
    return {
      handler: async (query: DevToolsAuthInput): Promise<{ isTrusted: boolean }> => {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          throw new Error('Failed to retrieve the current RPC session')

        // Reconnect with a node-issued bearer token persisted in the browser.
        if (query.authToken && verifyAuthToken(query.authToken, session, storage))
          return { isTrusted: true }

        // Static tokens configured via `devtools.clientAuthTokens` (session-only).
        const tokens = context.viteConfig.devtools?.config?.clientAuthTokens ?? []
        if (query.authToken && tokens.includes(query.authToken)) {
          session.meta.clientAuthToken = query.authToken
          session.meta.isTrusted = true
          return { isTrusted: true }
        }

        // Untrusted — show the code/link so the user can authorize this browser.
        promptForAuth(context, query)
        return { isTrusted: false }
      },
    }
  },
})

/**
 * `devframe:auth:exchange` — exchange the human-typed one-time code (or the
 * `devframe_otp` magic-link param) for a fresh node-issued bearer token. On
 * success the session is trusted and the token is returned for the client to
 * persist; on failure `authToken` is `null`.
 */
export const authExchange = defineRpcFunction({
  name: 'devframe:auth:exchange',
  type: 'action',
  jsonSerializable: true,
  setup: (context: ViteDevToolsNodeContext) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    return {
      handler: async (query: DevToolsAuthExchangeInput): Promise<{ authToken: string | null }> => {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          throw new Error('Failed to retrieve the current RPC session')

        const authToken = exchangeTempAuthCode(query.code, session, { ua: query.ua, origin: query.origin }, storage)
        if (authToken)
          console.log(c.green`${MARK_INFO} A browser has been authorized via one-time code.`)
        return { authToken }
      },
    }
  },
})
