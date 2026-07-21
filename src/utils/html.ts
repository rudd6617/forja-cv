// Quill 2 serializes every list as <ol> and marks the type on each
// <li data-list="bullet|ordered">. Split each <ol> into consecutive runs by
// type and rewrite bullet runs as <ul>, so downstream ul/ol handling
// (preview CSS, PDF parser) sees real list semantics. Also drops the
// editor-only <span class="ql-ui"> markers.
export function normalizeQuillLists(html: string): string {
  if (!html.includes('data-list')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('span.ql-ui').forEach((el) => el.remove())
  doc.querySelectorAll('ol').forEach((ol) => {
    const lists: HTMLElement[] = []
    for (const li of Array.from(ol.children)) {
      const tag = li.getAttribute('data-list') === 'bullet' ? 'ul' : 'ol'
      const last = lists[lists.length - 1]
      const list = last?.tagName.toLowerCase() === tag ? last : doc.createElement(tag)
      if (list !== last) lists.push(list)
      list.appendChild(li)
    }
    ol.replaceWith(...lists)
  })
  return doc.body.innerHTML
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent ?? ''
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function wrapHtml(text: string): string {
  return `<p>${escapeHtml(text)}</p>`
}
