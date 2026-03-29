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
  function inspect() {
    clearTimeout(timeoutId)
    chrome.devtools.inspectedWindow.eval(src, (res, err) => {
      if (err) {
        timeoutId = window.setTimeout(() => {
          inspect()
        }, 100)
        return
      }

      cb()
    })
  }
  inspect()
}

function init() {
  // inject script to window
  injectScript(chrome.runtime.getURL('dist/inject.mjs'), async () => {
  })

  chrome.devtools.network.onNavigated.addListener(() => {
    injectScript(chrome.runtime.getURL('dist/inject.mjs'), () => {
    })
  })
}

init()
