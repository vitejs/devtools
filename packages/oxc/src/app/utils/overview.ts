export function createOverview() {
  return {
    oxlint: {
      installed: false,
      version: undefined,
      latest: true,
      npmxLink: undefined,
    },
    oxfmt: {
      installed: false,
      version: undefined,
      latest: true,
      npmxLink: undefined,
    },
    vitePlus: undefined,
    needsOxlintMigration: false,
  }
}
