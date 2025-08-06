import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildNuxt, loadNuxt, useNuxt, writeTypes } from '@nuxt/kit'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = path.resolve(__dirname, '../../devtools-vite/src')
const buildDir = path.resolve(__dirname, '../dist/nuxt')
const distDir = path.resolve(__dirname, '../dist')

async function prepareTypes() {
  const nuxt = await loadNuxt({
    cwd: root,
    dev: false,
    overrides: {
      _prepare: true,
    },
  })

  await writeTypes(nuxt)
}

export async function buildDevToolsApp(buildDir: string) {
  fs.rmSync(distDir, { recursive: true, force: true })
  await prepareTypes()

  const nuxt = await loadNuxt({
    cwd: root,
    dev: false,
    overrides: {
      buildDir,
      ssr: false,
      router: {
        options: { hashMode: true },
      },
      experimental: {
        appManifest: false,
      },
      vite: {
        plugins: [
          {
            name: 'mount-app-dynamically',
            enforce: 'pre',
            transform(code, id) {
              if (id.match(/nuxt(3|-nightly)?\/.*\/entry\./)) {
                return `${code
                  .replace(/vueAppPromise = entry\(\)\.catch\(\(error\) => \{[\s\S]*?\}\);/g, '')
                  .replace(/export default \(ssrContext\) => entry\(ssrContext\)/g, '')
                }export const mountApp = entry;`
              }
            },
          },
        ],
      },
      nitro: {
        preset: '',
      },
      hooks: {
        // skip build nitro server
        'vite:compiled': function () {
          const nuxt = useNuxt()
          nuxt.hooks.removeAllHooks()
        },
      },
    },
  })

  return new Promise<void>((resolve, reject) => {
    nuxt.hooks.hook('vite:extendConfig', (config) => {
      config.build = {
        ...config.build,
        lib: {
          // @ts-expect-error skip type check
          entry: config.build.rollupOptions.input.entry,
          name: 'devtools-app',
          fileName: () => `devtools-app.js`,
          formats: ['es'],
        },
        rollupOptions: {
          ...config.build?.rollupOptions,
          output: {
            assetFileNames: 'devtools-app.[ext]',
          },
        },
      }
    })

    buildNuxt(nuxt).then(() => {
      resolve()
      fs.renameSync(path.resolve(buildDir, 'dist/client'), path.resolve(buildDir, '..', 'app'))
      fs.rmSync(path.resolve(distDir, 'nuxt'), { recursive: true, force: true })
    }).catch((err) => {
      console.error('build devtools app failed:', err)
      if (!err.toString().includes('_stop_')) {
        reject(err)
      }
    })
  }).finally(() => nuxt.close())
}

buildDevToolsApp(buildDir)
