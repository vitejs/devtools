/// <reference types="vite/client" />
/// <reference lib="dom" />

import { startDevTools } from '../inject/runtime'

// Passive entry: keep the docks hidden and print a hint to reveal them with the
// activation shortcut. Node injects this when the project's DevTools visibility
// resolves to `passive` (the default, until the developer opts in).
startDevTools('passive')
