import { sendMessage } from 'webext-bridge/devtools'
import { ViteDevToolsEvent } from './event'

function injectScript(scriptName: string, cb: () => void) {
  const src = `
    (function() {
      var script = document.constructor.prototype.createElement.call(document, 'script');
      script.src = "${scriptName}";
      script.type = "module";
      document.documentElement.appendChild(script);
      script.parentNode.removeChild(script);
    })()
  `
  let timeoutId: number = null!
  function execute() {
    clearTimeout(timeoutId)
    chrome.devtools.inspectedWindow.eval(src, (res, err) => {
      if (err) {
        // @ts-expect-error skip type check
        timeoutId = setTimeout(() => {
          execute()
        }, 100)
        return
      }

      cb()
    })
  }
  execute()
}

async function getMetadata() {
  return await sendMessage(ViteDevToolsEvent.GET_METADATA, {}, 'content-script')
}

async function connectToDevToolsApp() {
  const metadata = await getMetadata()
  window.__NUXT__ = {}
  window.__NUXT__.config = { public: {}, app: { baseURL: '/', buildAssetsDir: '/_nuxt/', cdnURL: '', metadata } }
  // @ts-expect-error skip type check
  const appModule = await import('./app/devtools-app.js')
  appModule.mountApp()
}

function init() {
  // inject script to window
  injectScript(chrome.runtime.getURL('dist/window.js'), async () => {
    connectToDevToolsApp()
  })

  chrome.devtools.network.onNavigated.addListener(() => {
    // unmount current devtools client
    injectScript(chrome.runtime.getURL('dist/window.js'), () => {
      // reconnect to new devtools client
    })
  })
}

init()
