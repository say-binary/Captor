let currentCapture = null

window.captorAPI.onShowAnnotation((data) => {
  currentCapture = data

  const isText = data.type === 'text-highlight'

  // Toggle which preview is visible
  document.getElementById('imgPreviewWrap').style.display = isText ? 'none' : 'flex'
  document.getElementById('textPreviewWrap').style.display = isText ? 'flex' : 'none'

  if (isText) {
    document.getElementById('textPreview').textContent = data.highlightedText || ''
    const srcEl = document.getElementById('sourceUrlPreview')
    srcEl.textContent = data.sourceUrl || ''
    srcEl.title = data.sourceUrl || ''
  } else {
    document.getElementById('preview').src = data.dataURL || ''
  }

  document.getElementById('note').value = ''
  document.getElementById('tags').value = ''
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

  const id = currentCapture.id || Date.now().toString()

  await window.captorAPI.saveHighlight({
    id,
    filePath: currentCapture.filePath || '',
    timestamp: currentCapture.timestamp || parseInt(id),
    width: currentCapture.width || 0,
    height: currentCapture.height || 0,
    note,
    tags,
    highlightedText: currentCapture.highlightedText || '',
    sourceUrl: currentCapture.sourceUrl || '',
    type: currentCapture.type || 'screenshot',
  })

  currentCapture = null
})

document.getElementById('cancelBtn').addEventListener('click', () => {
  currentCapture = null
  window.captorAPI.cancelAnnotation()
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    currentCapture = null
    window.captorAPI.cancelAnnotation()
  }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    document.getElementById('saveBtn').click()
  }
})
