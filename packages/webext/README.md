# @vitejs/devtools-webext

Browser extension scaffolding for Vite DevTools. Work in progress.

Requires Chrome 148 or later. The extension uses native structured-clone messaging to preserve inspected-page channel values, including typed arrays, maps, big integers, and cyclic objects.

Run the browser transport regression after installing the test browser:

```sh
pnpm -C e2e exec playwright-core install chromium
pnpm -C e2e exec vitest run tests/webext-inspected-page.test.ts
```

📖 [Documentation](https://devtools.vite.dev/)
