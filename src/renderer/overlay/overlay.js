const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

let isDrawing = false
let startX = 0
let startY = 0
let currentX = 0
let currentY = 0
let rafId = null

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  draw()
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Full-screen dim
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (!isDrawing) return

  const x = Math.min(startX, currentX)
  const y = Math.min(startY, currentY)
  const w = Math.abs(currentX - startX)
  const h = Math.abs(currentY - startY)

  if (w < 2 || h < 2) return

  // Punch a clear hole through the dim for the selected region
  ctx.clearRect(x, y, w, h)

  // Bright border around selection
  ctx.strokeStyle = 'rgba(108, 99, 255, 0.95)'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)

  // Corner handles
  const handleSize = 6
  ctx.fillStyle = '#6c63ff'
  const corners = [
    [x, y], [x + w - handleSize, y],
    [x, y + h - handleSize], [x + w - handleSize, y + h - handleSize],
  ]
  corners.forEach(([cx, cy]) => ctx.fillRect(cx, cy, handleSize, handleSize))

  // Dimension label
  const label = `${Math.round(w)} × ${Math.round(h)}`
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const textWidth = ctx.measureText(label).width
  const labelX = x + w / 2 - textWidth / 2
  const labelY = y > 24 ? y - 8 : y + h + 18

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(labelX - 4, labelY - 13, textWidth + 8, 18)
  ctx.fillStyle = '#fff'
  ctx.fillText(label, labelX, labelY)
}

function getRect() {
  const x = Math.min(startX, currentX)
  const y = Math.min(startY, currentY)
  const w = Math.abs(currentX - startX)
  const h = Math.abs(currentY - startY)
  return { x, y, width: w, height: h }
}

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  isDrawing = true
  startX = e.clientX
  startY = e.clientY
  currentX = e.clientX
  currentY = e.clientY
  draw()
})

window.addEventListener('mousemove', (e) => {
  if (!isDrawing) return
  currentX = e.clientX
  currentY = e.clientY
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(draw)
})

window.addEventListener('mouseup', async (e) => {
  if (!isDrawing || e.button !== 0) return
  isDrawing = false
  currentX = e.clientX
  currentY = e.clientY
  draw()

  const rect = getRect()
  if (rect.width < 4 || rect.height < 4) {
    // Selection too small — cancel
    window.captorAPI.cancelCapture()
    return
  }

  await window.captorAPI.selectionComplete(rect)
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    isDrawing = false
    window.captorAPI.cancelCapture()
  }
})

window.addEventListener('resize', resize)
resize()
