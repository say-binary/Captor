// Captor content script — show a save button when text is selected

let saveBtn = null
let hideTimer = null
let lockedText = ''  // selection captured at mouseup time

// ── Button creation ────────────────────────────────────
function createSaveButton() {
  const btn = document.createElement('button')
  btn.id = '__captor_save_btn__'
  btn.textContent = '📌 Save to Captor'
  btn.style.cssText = [
    'all:unset',                        // reset all page styles
    'position:fixed',
    'z-index:2147483647',
    'padding:7px 14px',
    'background:linear-gradient(135deg,#6c63ff,#4ecdc4)',
    'color:#fff',
    'border-radius:20px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'font-size:13px',
    'font-weight:600',
    'cursor:pointer',
    'box-shadow:0 4px 16px rgba(108,99,255,0.5)',
    'user-select:none',
    'pointer-events:auto',
    'white-space:nowrap',
    'display:none',
  ].join(';')

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()   // crucial: stops the click from collapsing the selection
    e.stopPropagation()
  })

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    sendHighlight()
  })

  document.documentElement.appendChild(btn)
  return btn
}

function getButton() {
  if (!saveBtn) saveBtn = createSaveButton()
  return saveBtn
}

// ── Show / hide ────────────────────────────────────────
function showButton(x, y) {
  const btn = getButton()
  clearTimeout(hideTimer)

  const btnW = 170
  const btnH = 36
  const margin = 8
  let left = x - btnW / 2
  let top  = y - btnH - margin

  left = Math.max(margin, Math.min(left, window.innerWidth  - btnW - margin))
  if (top < margin) top = y + margin + 4

  btn.style.left    = left + 'px'
  btn.style.top     = top  + 'px'
  btn.style.display = 'block'

  // Auto-hide after 5s if user doesn't interact
  hideTimer = setTimeout(hideButton, 5000)
}

function hideButton() {
  clearTimeout(hideTimer)
  if (saveBtn) saveBtn.style.display = 'none'
  lockedText = ''
}

// ── Event listeners ────────────────────────────────────

// Show button when user finishes a drag selection
document.addEventListener('mouseup', (e) => {
  // Ignore mouseup on our own button (handled by click)
  if (saveBtn && (e.target === saveBtn || saveBtn.contains(e.target))) return

  // Small delay so browser finalises the selection
  setTimeout(() => {
    const sel = window.getSelection()
    const text = sel ? sel.toString().trim() : ''

    if (text.length > 0) {
      lockedText = text
      showButton(e.clientX, e.clientY)
    } else {
      hideButton()
    }
  }, 20)
})

// Hide button when user clicks anywhere that isn't our button
document.addEventListener('mousedown', (e) => {
  if (saveBtn && saveBtn.style.display !== 'none') {
    if (e.target !== saveBtn && !saveBtn.contains(e.target)) {
      hideButton()
    }
  }
})

// ── Send to Captor ─────────────────────────────────────
function sendHighlight() {
  const text = lockedText
  if (!text) return

  hideButton()

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
      }
    }
  )
}

// ── Error toast ────────────────────────────────────────
function showToast(msg) {
  const toast = document.createElement('div')
  toast.textContent = msg
  toast.style.cssText = [
    'all:unset',
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483647',
    'background:#2a2a3e',
    'color:#e0e0f0',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:8px',
    'padding:10px 18px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'font-size:13px',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
    'pointer-events:none',
    'white-space:nowrap',
  ].join(';')
  document.documentElement.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}
