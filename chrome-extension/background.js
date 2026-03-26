// Captor background service worker
// Receives highlight messages from content script and forwards to native host

const NATIVE_HOST = 'com.captor.nativehost'

let port = null

function getPort() {
  if (port) return port
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST)
    port.onDisconnect.addListener(() => {
      console.log('Captor native host disconnected:', chrome.runtime.lastError?.message)
      port = null
    })
    port.onMessage.addListener((msg) => {
      console.log('Captor native host reply:', msg)
    })
  } catch (err) {
    console.error('Failed to connect to Captor native host:', err)
    port = null
  }
  return port
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SAVE_HIGHLIGHT') return

  const p = getPort()
  if (!p) {
    console.error('Captor: native host not available. Is the app running?')
    sendResponse({ ok: false, error: 'Native host not available' })
    return
  }

  p.postMessage({
    type: 'SAVE_HIGHLIGHT',
    highlightedText: message.highlightedText,
    sourceUrl: message.sourceUrl,
    sourceTitle: message.sourceTitle,
  })

  sendResponse({ ok: true })
})
