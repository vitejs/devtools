export const alphaModule = {
  id: 'alpha',
  title: 'Alpha Build Snapshot',
  checks: [
    { label: 'Chunk Split', score: 92 },
    { label: 'Treeshake', score: 87 },
    { label: 'Minify', score: 94 },
  ],
}

export function summarizeAlpha() {
  return alphaModule.checks
    .map(check => `${check.label}: ${check.score}`)
    .join(', ')
}
