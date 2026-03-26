let currentCapture = null

window.captorAPI.onShowAnnotation((data) => {
  currentCapture = data
  document.getElementById('preview').src = data.dataURL
  document.getElementById('note').value = ''
  document.getElementById('tags').value = ''
  // Auto-focus the note field
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

  await window.captorAPI.saveHighlight({
    id: currentCapture.id,
    filePath: currentCapture.filePath,
    timestamp: currentCapture.timestamp,
    width: currentCapture.width,
    height: currentCapture.height,
    note,
    tags,
  })

  currentCapture = null
})

document.getElementById('cancelBtn').addEventListener('click', () => {
  currentCapture = null
  window.captorAPI.cancelCapture()
})

// Allow Escape to cancel
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    currentCapture = null
    window.captorAPI.cancelCapture()
  }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    document.getElementById('saveBtn').click()
  }
})
