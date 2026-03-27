const { app } = require('electron')
const fs = require('fs')
const path = require('path')

// ── Config file (persists folder choice + button position) ────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  const p = getConfigPath()
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return {} }
}

function saveConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8')
}

function getActiveFolder() {
  return loadConfig().activeFolder || null
}

function setActiveFolder(folderPath) {
  const cfg = loadConfig()
  cfg.activeFolder = folderPath
  // Keep a deduped history list, most-recent first, max 20 entries
  const history = (cfg.folderHistory || []).filter((p) => p !== folderPath)
  history.unshift(folderPath)
  cfg.folderHistory = history.slice(0, 20)
  saveConfig(cfg)
}

function getFolderHistory() {
  return loadConfig().folderHistory || []
}

function saveButtonPosition(pos) {
  const cfg = loadConfig()
  cfg.buttonPosition = pos
  saveConfig(cfg)
}

function getButtonPosition() {
  return loadConfig().buttonPosition || null
}

// ── Screenshots directory ─────────────────────────────────────────────────
// Uses active folder if set, otherwise userData/screenshots
function getScreenshotsDir() {
  const active = getActiveFolder()
  const dir = active
    ? path.join(active, 'screenshots')
    : path.join(app.getPath('userData'), 'screenshots')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ── Index file ────────────────────────────────────────────────────────────
// Lives inside the active folder so each folder has its own highlights list.
// Falls back to userData/index.json when no folder is set.
function getIndexPath() {
  const active = getActiveFolder()
  if (active) return path.join(active, 'index.json')
  return path.join(app.getPath('userData'), 'index.json')
}

function loadIndex() {
  const p = getIndexPath()
  if (!fs.existsSync(p)) return []
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return [] }
}

function appendEntry(entry) {
  const index = loadIndex()
  index.unshift(entry)
  const tmp = getIndexPath() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8')
  fs.renameSync(tmp, getIndexPath())
}

function updateEntry(id, fields) {
  const index = loadIndex()
  const i = index.findIndex((e) => e.id === id)
  if (i === -1) return false
  index[i] = { ...index[i], ...fields }
  const tmp = getIndexPath() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8')
  fs.renameSync(tmp, getIndexPath())
  return index[i]
}

function deleteEntry(id) {
  const index = loadIndex()
  const i = index.findIndex((e) => e.id === id)
  if (i === -1) return false
  const [removed] = index.splice(i, 1)
  // Delete associated PNG if it exists
  if (removed.filePath && fs.existsSync(removed.filePath)) {
    try { fs.unlinkSync(removed.filePath) } catch { /* ignore */ }
  }
  const tmp = getIndexPath() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8')
  fs.renameSync(tmp, getIndexPath())
  return true
}

// ── Thumbnail data URL ────────────────────────────────────────────────────
function getThumbnailData(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  return 'data:image/png;base64,' + buf.toString('base64')
}

// ── Folder tree (for sidebar) ─────────────────────────────────────────────
// Returns a simple nested structure: { name, path, children[] }
function getFolderTree(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return null
  return buildTree(folderPath, 0)
}

function buildTree(dirPath, depth) {
  const name = path.basename(dirPath)
  const node = { name, path: dirPath, children: [] }
  if (depth >= 4) return node // limit depth
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue
      node.children.push(buildTree(path.join(dirPath, entry.name), depth + 1))
    }
  } catch { /* permission denied etc */ }
  return node
}

module.exports = {
  getScreenshotsDir,
  loadIndex,
  appendEntry,
  updateEntry,
  deleteEntry,
  getThumbnailData,
  getActiveFolder,
  setActiveFolder,
  getFolderHistory,
  getFolderTree,
  saveButtonPosition,
  getButtonPosition,
}
