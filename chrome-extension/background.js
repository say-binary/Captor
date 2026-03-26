// Captor background service worker
// Receives highlight messages from content script and forwards to native host

const NATIVE_HOST = 'com.captor.nativehost'

// Use sendNativeMessage (one-shot) instead of connectNative (persistent port).
// MV3 service workers are terminated when idle — a persistent port would be
// lost silently. sendNativeMessage wakes the host fresh each time.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SAVE_HIGHLIGHT') return true

  chrome.runtime.sendNativeMessage(
    NATIVE_HOST,
    {
      type: 'SAVE_HIGHLIGHT',
      highlightedText: message.highlightedText,
      sourceUrl: message.sourceUrl,
      sourceTitle: message.sourceTitle,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        const err = chrome.runtime.lastError.message
        console.error('Captor native host error:', err)
        sendResponse({ ok: false, error: err })
      } else {
        sendResponse(response || { ok: true })
      }
    }
  )

  return true // keep message channel open for async sendResponse
})
