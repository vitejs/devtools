export default defineAppConfig({
  ui: {
    card: {
      slots: {
        root: 'rounded-lg',
        header: 'py-2 px-4 sm:px-4',
        body: 'p-0 sm:p-0',
        footer: 'p-4 sm:px-6',
      },
    },
    colors: {
      primary: 'cyan',
      neutral: 'zinc',
    },
  },
})
