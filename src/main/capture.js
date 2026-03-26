const { desktopCapturer, screen } = require('electron')
const fs = require('fs')
const path = require('path')
const storage = require('./storage')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function takeScreenshot(rect) {
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

  const source =
    sources.find((s) => s.display_id === String(display.id)) || sources[0]

  if (!source) throw new Error('No screen source found')

  const full = source.thumbnail

  const cropRect = {
    x: Math.round((rect.x - display.bounds.x) * scaleFactor),
    y: Math.round((rect.y - display.bounds.y) * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor),
  }

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
  const screenshotsDir = storage.getScreenshotsDir()
  const filePath = path.join(screenshotsDir, `${id}.png`)
  fs.writeFileSync(filePath, cropped.toPNG())

  const previewWidth = Math.min(480, cropRect.width)
  const dataURL = cropped.resize({ width: previewWidth }).toDataURL()

  return {
    id,
    filePath,
    dataURL,
    timestamp: parseInt(id),
    width: rect.width,
    height: rect.height,
    type: 'screenshot',
  }
}

module.exports = { takeScreenshot }
