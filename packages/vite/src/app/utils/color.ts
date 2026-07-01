import { getHashColorFromString, getHsla } from '@vitejs/devtools-ui/utils/color'

export const predefinedColorMap = {
  error: 0,
  client: 60,
  ssr: 270,
  vite: 250,
  virtual: 160,
} as Record<string, number>

export function getPluginColor(name: string, opacity = 1): string {
  name = name.replace(/[^a-z]+/gi, '').toLowerCase()
  if (name in predefinedColorMap)
    return getHsla(predefinedColorMap[name]!, opacity)
  return getHashColorFromString(name, opacity)
}
