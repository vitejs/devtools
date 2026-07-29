/// <reference types="vite/client" />
/// <reference lib="dom" />

import { startDevTools } from '../inject/runtime'

// Hidden entry: keep the docks hidden and print a hint to reveal them with the
// activation shortcut — but never remember the reveal. Node injects this when
// the project's DevTools visibility resolves to `hidden`, so every load starts
// hidden and the shortcut opens the docks for that session only.
startDevTools('hidden')
