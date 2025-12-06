import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface DevToolsAuthInput {
  authId: string
  ua: string
}

export interface DevToolsAuthReturn {
  isTrusted: boolean
}

export const anonymousAuth = defineRpcFunction({
  name: 'vite:anonymous:auth',
  type: 'action',
  setup: (context) => {
    return {
      handler: (query: DevToolsAuthInput): DevToolsAuthReturn => {
        // TODO: Implement the auth logic
        return {
          isTrusted: false,
        }
      },
    }
  },
})
