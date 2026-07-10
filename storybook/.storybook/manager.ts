import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { addons } from 'storybook/manager-api'
import { themes } from 'storybook/theming'

addons.register('theme-sync', (api) => {
  const apply = (t?: string): void => api.setOptions({ theme: t === 'dark' ? themes.dark : themes.light })
  apply(api.getGlobals().theme)
  api.getChannel()?.on(GLOBALS_UPDATED, ({ globals }: { globals?: { theme?: string } }) => apply(globals?.theme))
})
