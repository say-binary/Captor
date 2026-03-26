// Captor content script — inject a save button when text is selected

let saveBtn = null
let hideTimer = null
let justShown = false  // suppress selectionchange-triggered hides right after mouseup
let lockedText = ''    // text that was selected when button was shown

function createSaveButton() {
  const btn = document.createElement('button')
  btn.id = '__captor_save_btn__'
  btn.textContent = '📌 Save to Captor'
  btn.style.cssText = [
    'position: fixed',
    'z-index: 2147483647',
    'padding: 6px 12px',
    'background: linear-gradient(135deg, #6c63ff, #4ecdc4)',
    'color: #fff',
    'border: none',
    'border-radius: 20px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'font-size: 13px',
    'font-weight: 600',
    'cursor: pointer',
    'box-shadow: 0 4px 16px rgba(108,99,255,0.45)',
    'transition: opacity 0.15s, transform 0.1s',
    'user-select: none',
    'pointer-events: auto',
  ].join(';')

  btn.addEventListener('mouseenter', () => {
    clearTimeout(hideTimer)
    btn.style.opacity = '1'
    btn.style.transform = 'scale(1.05)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'
    scheduleHide()
  })
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault() // Don't deselect text
  })
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    sendHighlight()
  })

  document.body.appendChild(btn)
  return btn
}

function positionButton(x, y) {
  if (!saveBtn) saveBtn = createSaveButton()
  // Place above the cursor; keep inside viewport
  const btnW = 160
  const btnH = 36
  const margin = 8
  let left = x - btnW / 2
  let top = y - btnH - margin

  left = Math.max(margin, Math.min(left, window.innerWidth - btnW - margin))
  if (top < margin) top = y + margin

  saveBtn.style.left = `${left}px`
  saveBtn.style.top = `${top}px`
  saveBtn.style.display = 'block'
  saveBtn.style.opacity = '1'
}

function hideButton() {
  if (saveBtn) {
    saveBtn.style.display = 'none'
  }
}

function scheduleHide(delay = 1800) {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hideButton, delay)
}

document.addEventListener('mouseup', (e) => {
  // Ignore clicks on our own button
  if (e.target === saveBtn) return

  // Give browser a tick to update the selection
  setTimeout(() => {
    const sel = window.getSelection()
    const text = sel ? sel.toString().trim() : ''
    if (text.length > 0) {
      // Don't reposition if the same text is still selected and button is visible
      if (text === lockedText && saveBtn && saveBtn.style.display !== 'none') return

      lockedText = text
      positionButton(e.clientX, e.clientY)
      justShown = true
      setTimeout(() => { justShown = false }, 500)
      scheduleHide(4000)
    } else {
      lockedText = ''
      hideButton()
    }
  }, 10)
})

document.addEventListener('selectionchange', () => {
  if (justShown) return // don't fight with mouseup
  const sel = window.getSelection()
  if (!sel || sel.toString().trim().length === 0) {
    // Only hide if the button is currently visible
    if (saveBtn && saveBtn.style.display !== 'none') {
      scheduleHide(400)
    }
  }
})

function sendHighlight() {
  // Use lockedText first (most reliable), fall back to live selection
  const text = lockedText || (window.getSelection() ? window.getSelection().toString().trim() : '')
  if (!text) return

  lockedText = ''
  hideButton()

  chrome.runtime.sendMessage(
    {
      type: 'SAVE_HIGHLIGHT',
      highlightedText: text,
      sourceUrl: window.location.href,
      sourceTitle: document.title,
    },
    (response) => {
      if (chrome.runtime.lastError || (response && !response.ok)) {
        showToast('Captor app is not running. Launch it first.')
      }
    }
  )
}

function showToast(msg) {
  const toast = document.createElement('div')
  toast.textContent = msg
  toast.style.cssText = [
    'position: fixed',
    'bottom: 24px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 2147483647',
    'background: #2a2a3e',
    'color: #e0e0f0',
    'border: 1px solid rgba(255,255,255,0.12)',
    'border-radius: 8px',
    'padding: 10px 18px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'font-size: 13px',
    'box-shadow: 0 4px 20px rgba(0,0,0,0.4)',
    'pointer-events: none',
  ].join(';')
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}
