let allHighlights = []
let activeTag = '__all__'
let searchQuery = ''
let sortOrder = 'newest'

// ── Load initial data ──────────────────────────────────
async function loadAll() {
  allHighlights = await window.captorAPI.loadHighlights()
  renderTagSidebar()
  renderGrid()
}

loadAll()

// Listen for newly saved highlights (no need to reload all)
window.captorAPI.onHighlightSaved((entry) => {
  allHighlights.unshift(entry)
  renderTagSidebar()
  renderGrid()
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
        (h.tags && h.tags.some((t) => t.includes(q)))
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

  Array.from(tagSet)
    .sort()
    .forEach((tag) => {
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

  // Load thumbnails and build cards
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
  imgWrap.className = 'card-img-wrap'
  const img = document.createElement('img')
  img.alt = highlight.note || 'Highlight'

  // Load image asynchronously
  const dataURL = await window.captorAPI.getThumbnailData(highlight.filePath)
  if (dataURL) img.src = dataURL
  imgWrap.appendChild(img)

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

// ── Lightbox ───────────────────────────────────────────
function openLightbox(highlight, dataURL) {
  const lb = document.getElementById('lightbox')
  document.getElementById('lightboxImg').src = dataURL || ''
  document.getElementById('lightboxNote').textContent = highlight.note || ''
  document.getElementById('lightboxDate').textContent = formatDate(highlight.timestamp)

  const tagsEl = document.getElementById('lightboxTags')
  tagsEl.innerHTML = ''
  ;(highlight.tags || []).forEach((tag) => {
    const badge = document.createElement('span')
    badge.className = 'tag-badge'
    badge.textContent = tag
    tagsEl.appendChild(badge)
  })

  lb.style.display = 'flex'
}

document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.classList.contains('lightbox-backdrop') || e.target.classList.contains('lightbox-close')) {
    document.getElementById('lightbox').style.display = 'none'
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('lightbox').style.display = 'none'
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
