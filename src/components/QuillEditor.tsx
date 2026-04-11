import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface QuillEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minimal?: boolean
}

const FULL_TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['link'],
  ['clean'],
]

const MINIMAL_TOOLBAR = [['bold', 'italic', 'underline'], ['link'], ['clean']]

export function QuillEditor({
  value,
  onChange,
  placeholder,
  minimal = false,
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastValueRef = useRef(value)
  onChangeRef.current = onChange

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    const editorDiv = document.createElement('div')
    container.appendChild(editorDiv)

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: minimal ? MINIMAL_TOOLBAR : FULL_TOOLBAR,
      },
    })

    const delta = quill.clipboard.convert({ html: value })
    quill.setContents(delta, 'silent')

    quill.on('text-change', () => {
      const html = quill.root.innerHTML
      const normalized = html === '<p><br></p>' ? '' : html
      lastValueRef.current = normalized
      onChangeRef.current(normalized)
    })

    quillRef.current = quill

    return () => {
      quill.off('text-change')
      quillRef.current = null
      container.innerHTML = ''
    }
    // Only run on mount — placeholder/minimal are static per instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (value === lastValueRef.current) return
    const quill = quillRef.current
    if (!quill) return
    lastValueRef.current = value
    const delta = quill.clipboard.convert({ html: value })
    quill.setContents(delta, 'silent')
  }, [value])

  return <div ref={containerRef} />
}
