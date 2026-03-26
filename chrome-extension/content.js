// Captor content script
// Listens for Cmd+Shift+S (Mac) / Ctrl+Shift+S (Win/Linux)
// Sends the current text selection to the Captor desktop app

document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const trigger = isMac
    ? (e.metaKey && e.shiftKey && e.key === 'S')
    : (e.ctrlKey && e.shiftKey && e.key === 'S')

  if (!trigger) return

  const sel = window.getSelection()
  const text = sel ? sel.toString().trim() : ''
  if (!text) return

  e.preventDefault()
  e.stopPropagation()

  chrome.runtime.sendMessage(
    {
      type: 'SAVE_HIGHLIGHT',
      highlightedText: text,
      sourceUrl: window.location.href,
      sourceTitle: document.title,
    },
    (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        const err = chrome.runtime.lastError
          ? chrome.runtime.lastError.message
          : (response && response.error) || 'unknown error'
        showToast('Captor: ' + err)
      } else {
        showToast('Saved to Captor ✓', true)
      }
    }
  )
})

function showToast(msg, success) {
  // Remove any existing toast
  const existing = document.getElementById('__captor_toast__')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = '__captor_toast__'
  toast.textContent = msg
  toast.style.cssText = [
    'all:unset',
    'position:fixed',
    'bottom:28px',
    'right:28px',
    'z-index:2147483647',
    'background:' + (success ? '#1a1a2e' : '#3a1a1a'),
    'color:' + (success ? '#a0f0c0' : '#f0a0a0'),
    'border:1px solid ' + (success ? 'rgba(100,255,150,0.25)' : 'rgba(255,100,100,0.25)'),
    'border-radius:10px',
    'padding:10px 16px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'font-size:13px',
    'font-weight:500',
    'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
    'pointer-events:none',
    'white-space:nowrap',
    'opacity:0',
    'transition:opacity 0.15s ease',
  ].join(';')

  document.documentElement.appendChild(toast)
  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.style.opacity = '1' })
  })
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 200)
  }, 2500)
}
