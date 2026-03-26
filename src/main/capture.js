const { desktopCapturer, screen, app } = require('electron')
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const storage = require('./storage')

function runOCR(filePath) {
  return new Promise((resolve) => {
    // Resolve the helper path relative to the app — works both in dev and packaged
    const helperPath = app.isPackaged
      ? path.join(process.resourcesPath, 'helpers', 'ocr')
      : path.join(__dirname, '../../helpers/ocr')

    execFile(helperPath, [filePath], { timeout: 10000 }, (err, stdout) => {
      if (err) {
        console.warn('OCR failed:', err.message)
        resolve('')
        return
      }
      resolve(stdout.trim())
    })
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function takeScreenshot(rect) {
  // Give OS time to repaint after overlay hides
  await delay(100)

  const pt = { x: rect.x, y: rect.y }
  const display = screen.getDisplayNearestPoint(pt)
  const { width, height } = display.size
  const scaleFactor = display.scaleFactor || 1

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor),
    },
  })

  // Match source to the correct display
  const source =
    sources.find((s) => s.display_id === String(display.id)) || sources[0]

  if (!source) throw new Error('No screen source found')

  const full = source.thumbnail

  // Adjust rect to be display-relative and account for DPI scaling
  const cropRect = {
    x: Math.round((rect.x - display.bounds.x) * scaleFactor),
    y: Math.round((rect.y - display.bounds.y) * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor),
  }

  // Clamp to image bounds
  const imgSize = full.getSize()
  cropRect.x = Math.max(0, Math.min(cropRect.x, imgSize.width - 1))
  cropRect.y = Math.max(0, Math.min(cropRect.y, imgSize.height - 1))
  cropRect.width = Math.min(cropRect.width, imgSize.width - cropRect.x)
  cropRect.height = Math.min(cropRect.height, imgSize.height - cropRect.y)

  if (cropRect.width <= 0 || cropRect.height <= 0) {
    throw new Error('Selection too small or out of bounds')
  }

  const cropped = full.crop(cropRect)

  const id = Date.now().toString()
  const filePath = path.join(storage.getScreenshotsDir(), `${id}.png`)
  fs.writeFileSync(filePath, cropped.toPNG())

  // Produce a 480px-wide preview thumbnail as dataURL for the annotation window
  const previewWidth = Math.min(480, cropRect.width)
  const dataURL = cropped.resize({ width: previewWidth }).toDataURL()

  // Run OCR on the saved PNG (non-blocking via Promise.race with a fallback)
  const extractedText = await runOCR(filePath)

  return {
    id,
    filePath,
    dataURL,
    timestamp: parseInt(id),
    width: rect.width,
    height: rect.height,
    extractedText,
  }
}

module.exports = { takeScreenshot }
