// Captor content script — inject a save button when text is selected

let saveBtn = null
let hideTimer = null

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
  // Give browser a tick to update the selection
  setTimeout(() => {
    const sel = window.getSelection()
    const text = sel ? sel.toString().trim() : ''
    if (text.length > 0) {
      positionButton(e.clientX, e.clientY)
      scheduleHide(3000)
    } else {
      hideButton()
    }
  }, 10)
})

document.addEventListener('selectionchange', () => {
  const sel = window.getSelection()
  if (!sel || sel.toString().trim().length === 0) {
    scheduleHide(300)
  }
})

function sendHighlight() {
  const sel = window.getSelection()
  const text = sel ? sel.toString().trim() : ''
  if (!text) return

  hideButton()

  chrome.runtime.sendMessage({
    type: 'SAVE_HIGHLIGHT',
    highlightedText: text,
    sourceUrl: window.location.href,
    sourceTitle: document.title,
  })
}
