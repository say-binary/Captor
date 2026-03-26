let currentCapture = null

window.captorAPI.onShowAnnotation((data) => {
  currentCapture = data

  document.getElementById('preview').src = data.dataURL
  document.getElementById('note').value = ''
  document.getElementById('tags').value = ''

  // Show OCR section if text was extracted
  const ocrSection = document.getElementById('ocrSection')
  const extractedTextEl = document.getElementById('extractedText')

  if (data.extractedText && data.extractedText.trim()) {
    extractedTextEl.value = data.extractedText
    ocrSection.style.display = 'flex'
  } else {
    extractedTextEl.value = ''
    ocrSection.style.display = 'none'
  }

  // Auto-focus note field
  setTimeout(() => document.getElementById('note').focus(), 80)
})

document.getElementById('saveBtn').addEventListener('click', async () => {
  if (!currentCapture) return

  const note = document.getElementById('note').value.trim()
  const rawTags = document.getElementById('tags').value
  const tags = rawTags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const extractedText = document.getElementById('extractedText').value.trim()

  await window.captorAPI.saveHighlight({
    id: currentCapture.id,
    filePath: currentCapture.filePath,
    timestamp: currentCapture.timestamp,
    width: currentCapture.width,
    height: currentCapture.height,
    note,
    tags,
    extractedText,
  })

  currentCapture = null
})

document.getElementById('cancelBtn').addEventListener('click', () => {
  currentCapture = null
  window.captorAPI.cancelCapture()
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    currentCapture = null
    window.captorAPI.cancelCapture()
  }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    document.getElementById('saveBtn').click()
  }
})
