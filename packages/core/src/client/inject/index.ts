/// <reference types="vite/client" />
/// <reference lib="dom" />

import { startDevTools } from './runtime'

// Normal entry: mount the floating docks immediately. Node injects this when
// the project's DevTools visibility resolves to `normal`.
startDevTools('normal')
