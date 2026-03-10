export const betaModule = {
  id: 'beta',
  nodes: [
    'entry:src/main.ts',
    'feature:src/modules/alpha.ts',
    'feature:src/modules/beta.ts',
    'iframe-ui:src/ui/main.tsx',
    'plugin-backend:src/node/index.ts',
  ],
}

export function summarizeBeta() {
  return `Module graph includes ${betaModule.nodes.length} tracked nodes`
}
