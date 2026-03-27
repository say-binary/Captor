let allHighlights = []
let activeTag = '__all__'
let searchQuery = ''
let sortOrder = 'newest'
let lightboxCurrentId = null  // track which entry is open in the edit panel

// ── Init ───────────────────────────────────────────────
async function init() {
  await renderFolderList()

  allHighlights = await window.captorAPI.loadHighlights()
  renderTagSidebar()
  renderGrid()
}

init()

// Listen for newly saved highlights
window.captorAPI.onHighlightSaved((entry) => {
  allHighlights.unshift(entry)
  renderTagSidebar()
  renderGrid()
})

// Sync edits/deletes broadcast from main process (if multiple windows ever open)
window.captorAPI.onHighlightUpdated((entry) => {
  const i = allHighlights.findIndex((h) => h.id === entry.id)
  if (i !== -1) allHighlights[i] = entry
  renderTagSidebar()
  renderGrid()
})

window.captorAPI.onHighlightDeleted((id) => {
  allHighlights = allHighlights.filter((h) => h.id !== id)
  renderTagSidebar()
  renderGrid()
})

// Listen for folder changes
window.captorAPI.onFolderChanged(({ folderPath }) => {
  renderFolderList()
  window.captorAPI.loadHighlights().then((list) => {
    allHighlights = list
    renderTagSidebar()
    renderGrid()
  })
})

// ── Folder UI ──────────────────────────────────────────
async function renderFolderList() {
  const listEl = document.getElementById('folderList')
  listEl.innerHTML = ''

  const [history, activeFolder] = await Promise.all([
    window.captorAPI.getFolderHistory(),
    window.captorAPI.getActiveFolder(),
  ])

  if (!history || history.length === 0) return

  history.forEach((folderPath) => {
    const parts = folderPath.replace(/\\/g, '/').split('/')
    const name = parts[parts.length - 1] || folderPath
    const isActive = folderPath === activeFolder

    const item = document.createElement('div')
    item.className = 'folder-item' + (isActive ? ' active' : '')

    const nameBtn = document.createElement('div')
    nameBtn.className = 'folder-item-name'
    nameBtn.title = folderPath
    nameBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" width="13" height="13">
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5h3.086a1 1 0 0 1 .707.293L7.5 4h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5z" stroke="currentColor" stroke-width="1.2" fill="none"/>
    </svg>`
    const nameSpan = document.createElement('span')
    nameSpan.textContent = name
    nameBtn.appendChild(nameSpan)

    const openBtn = document.createElement('button')
    openBtn.className = 'folder-item-open'
    openBtn.title = 'Open in Finder'
    openBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" width="13" height="13">
      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M9 2h5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 2L8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`

    item.appendChild(nameBtn)
    item.appendChild(openBtn)

    nameBtn.addEventListener('click', async () => {
      await window.captorAPI.setActiveFolder(folderPath)
      // onFolderChanged will fire and re-render everything
    })

    openBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      window.captorAPI.openInFinder(folderPath)
    })

    listEl.appendChild(item)
  })
}

document.getElementById('chooseFolderBtn').addEventListener('click', async () => {
  const folderPath = await window.captorAPI.chooseFolder()
  if (folderPath) {
    // onFolderChanged fires automatically; renderFolderList is called there
    allHighlights = await window.captorAPI.loadHighlights()
    renderTagSidebar()
    renderGrid()
  }
})

// ── Filtering & sorting ────────────────────────────────
function getFiltered() {
  let list = allHighlights.slice()

  if (activeTag !== '__all__') {
    list = list.filter((h) => h.tags && h.tags.includes(activeTag))
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    list = list.filter(
      (h) =>
        (h.note && h.note.toLowerCase().includes(q)) ||
        (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
        (h.highlightedText && h.highlightedText.toLowerCase().includes(q)) ||
        (h.sourceUrl && h.sourceUrl.toLowerCase().includes(q))
    )
  }

  if (sortOrder === 'oldest') list.reverse()
  return list
}

// ── Render tag sidebar ─────────────────────────────────
function renderTagSidebar() {
  const tagSet = new Set()
  allHighlights.forEach((h) => (h.tags || []).forEach((t) => tagSet.add(t)))

  const tagList = document.getElementById('tagList')
  tagList.innerHTML = ''

  const allBtn = document.createElement('button')
  allBtn.className = 'tag-pill' + (activeTag === '__all__' ? ' active' : '')
  allBtn.dataset.tag = '__all__'
  allBtn.textContent = 'All'
  tagList.appendChild(allBtn)

  Array.from(tagSet).sort().forEach((tag) => {
    const btn = document.createElement('button')
    btn.className = 'tag-pill' + (activeTag === tag ? ' active' : '')
    btn.dataset.tag = tag
    btn.textContent = tag
    tagList.appendChild(btn)
  })
}

document.getElementById('tagList').addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-pill')
  if (!btn) return
  activeTag = btn.dataset.tag
  document.querySelectorAll('.tag-pill').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('viewTitle').textContent =
    activeTag === '__all__' ? 'All Highlights' : `#${activeTag}`
  renderGrid()
})

// ── Render grid ────────────────────────────────────────
async function renderGrid() {
  const list = getFiltered()
  const grid = document.getElementById('grid')
  const emptyState = document.getElementById('emptyState')
  const countLabel = document.getElementById('countLabel')

  countLabel.textContent = `${allHighlights.length} highlight${allHighlights.length !== 1 ? 's' : ''}`

  if (list.length === 0) {
    grid.style.display = 'none'
    emptyState.style.display = 'flex'
    return
  }

  grid.style.display = 'grid'
  emptyState.style.display = 'none'
  grid.innerHTML = ''

  for (const highlight of list) {
    const card = await buildCard(highlight)
    grid.appendChild(card)
  }
}

async function buildCard(highlight) {
  const card = document.createElement('div')
  card.className = 'card'
  card.dataset.id = highlight.id

  const imgWrap = document.createElement('div')
  let dataURL = null

  if (highlight.type === 'text-highlight') {
    imgWrap.className = 'card-img-wrap text-only'
    const excerpt = document.createElement('div')
    excerpt.className = 'card-highlight-excerpt'
    excerpt.textContent = highlight.highlightedText || ''
    imgWrap.appendChild(excerpt)
    if (highlight.sourceUrl) {
      const src = document.createElement('div')
      src.className = 'card-source'
      src.textContent = highlight.sourceUrl
      src.title = highlight.sourceUrl
      imgWrap.appendChild(src)
    }
  } else {
    imgWrap.className = 'card-img-wrap'
    const img = document.createElement('img')
    img.alt = highlight.note || 'Highlight'
    dataURL = await window.captorAPI.getThumbnailData(highlight.filePath)
    if (dataURL) img.src = dataURL
    imgWrap.appendChild(img)
  }

  const body = document.createElement('div')
  body.className = 'card-body'

  const noteEl = document.createElement('div')
  noteEl.className = 'card-note' + (highlight.note ? '' : ' empty')
  noteEl.textContent = highlight.note || 'No note'
  body.appendChild(noteEl)

  if (highlight.tags && highlight.tags.length > 0) {
    const tagsEl = document.createElement('div')
    tagsEl.className = 'card-tags'
    highlight.tags.forEach((tag) => {
      const badge = document.createElement('span')
      badge.className = 'tag-badge'
      badge.textContent = tag
      tagsEl.appendChild(badge)
    })
    body.appendChild(tagsEl)
  }

  const dateEl = document.createElement('div')
  dateEl.className = 'card-date'
  dateEl.textContent = formatDate(highlight.timestamp)
  body.appendChild(dateEl)

  card.appendChild(imgWrap)
  card.appendChild(body)
  card.addEventListener('click', () => openLightbox(highlight, dataURL))
  return card
}

// ── Lightbox / Edit panel ──────────────────────────────
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none'
  lightboxCurrentId = null
}

function openLightbox(highlight, dataURL) {
  lightboxCurrentId = highlight.id

  // Image
  const imgEl = document.getElementById('lightboxImg')
  if (highlight.type !== 'text-highlight' && dataURL) {
    imgEl.src = dataURL
    imgEl.style.display = 'block'
  } else {
    imgEl.src = ''
    imgEl.style.display = 'none'
  }

  // Date
  document.getElementById('lightboxDate').textContent = formatDate(highlight.timestamp)

  // Highlighted text block (text-highlight only)
  const highlightBlock = document.getElementById('lightboxHighlightBlock')
  if (highlight.type === 'text-highlight') {
    document.getElementById('lightboxHighlightText').value = highlight.highlightedText || ''
    document.getElementById('lightboxSourceUrl').value = highlight.sourceUrl || ''
    highlightBlock.style.display = 'block'
  } else {
    highlightBlock.style.display = 'none'
  }

  // Note and tags
  document.getElementById('lightboxNote').value = highlight.note || ''
  document.getElementById('lightboxTagsInput').value = (highlight.tags || []).join(', ')

  document.getElementById('lightbox').style.display = 'flex'
}

// Save changes
document.getElementById('lightboxSaveBtn').addEventListener('click', async () => {
  if (!lightboxCurrentId) return

  const highlight = allHighlights.find((h) => h.id === lightboxCurrentId)
  if (!highlight) return

  const fields = {
    note: document.getElementById('lightboxNote').value.trim(),
    tags: document.getElementById('lightboxTagsInput').value
      .split(',').map((t) => t.trim()).filter(Boolean),
  }

  if (highlight.type === 'text-highlight') {
    fields.highlightedText = document.getElementById('lightboxHighlightText').value.trim()
    fields.sourceUrl = document.getElementById('lightboxSourceUrl').value.trim()
  }

  const updated = await window.captorAPI.updateHighlight(lightboxCurrentId, fields)
  if (updated && updated.id) {
    const i = allHighlights.findIndex((h) => h.id === updated.id)
    if (i !== -1) allHighlights[i] = updated
    renderTagSidebar()
    renderGrid()
  }
  closeLightbox()
})

// Cancel — just close without saving
document.getElementById('lightboxCancelBtn').addEventListener('click', closeLightbox)

// Delete
document.getElementById('lightboxDeleteBtn').addEventListener('click', async () => {
  if (!lightboxCurrentId) return
  const confirmed = confirm('Delete this highlight? This cannot be undone.')
  if (!confirmed) return

  await window.captorAPI.deleteHighlight(lightboxCurrentId)
  allHighlights = allHighlights.filter((h) => h.id !== lightboxCurrentId)
  renderTagSidebar()
  renderGrid()
  closeLightbox()
})

// Close on backdrop click
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.classList.contains('lightbox-backdrop') ||
      e.target.classList.contains('lightbox-close')) {
    closeLightbox()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox()
})

// ── Controls ───────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim()
  renderGrid()
})

document.getElementById('sortSelect').addEventListener('change', (e) => {
  sortOrder = e.target.value
  renderGrid()
})

// ── Utils ──────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  )
}
