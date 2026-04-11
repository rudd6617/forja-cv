import { useRef, useState } from 'react'
import type { ResumeData, ResumeItem, SectionKey } from '../types/resume'
import { stripHtml, wrapHtml } from '../utils/html'
import { QuillEditor } from './QuillEditor'

interface FieldDef {
  key: keyof ResumeItem
  label: string
  rich?: boolean
}

interface EditorPanelProps {
  data: ResumeData
  updateAbout: (field: 'name' | 'jobTitle', value: string) => void
  updateSummary: (
    field: 'paragraph' | 'hashtags',
    value: string | string[],
  ) => void
  updateSectionItem: (
    section: SectionKey,
    index: number,
    item: Partial<ResumeItem>,
  ) => void
  addSectionItem: (section: SectionKey) => void
  removeSectionItem: (section: SectionKey, index: number) => void
  moveSectionItem: (section: SectionKey, from: number, to: number) => void
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-700 cursor-pointer"
    >
      {title}
      <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
    </button>
  )
}

function AboutEditor({
  about,
  updateAbout,
}: {
  about: ResumeData['user']['about']
  updateAbout: EditorPanelProps['updateAbout']
}) {
  return (
    <div className="p-4 space-y-3">
      <label className="block text-xs font-medium text-gray-500">Name</label>
      <QuillEditor
        value={about.name}
        onChange={(v) => updateAbout('name', v)}
        minimal
      />
      <label className="block text-xs font-medium text-gray-500">
        Job Title
      </label>
      <QuillEditor
        value={about.jobTitle}
        onChange={(v) => updateAbout('jobTitle', v)}
        minimal
      />
    </div>
  )
}

function SummaryEditor({
  summary,
  updateSummary,
}: {
  summary: ResumeData['user']['summary']
  updateSummary: EditorPanelProps['updateSummary']
}) {
  const hashtagsText = summary.hashtags
    .map((h) => stripHtml(h))
    .join(', ')

  return (
    <div className="p-4 space-y-3">
      <label className="block text-xs font-medium text-gray-500">
        Hashtags (comma separated)
      </label>
      <input
        type="text"
        value={hashtagsText}
        onChange={(e) => {
          const tags = e.target.value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => wrapHtml(t))
          updateSummary('hashtags', tags)
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
      />
      <label className="block text-xs font-medium text-gray-500">
        Summary
      </label>
      <QuillEditor
        value={summary.paragraph}
        onChange={(v) => updateSummary('paragraph', v)}
      />
    </div>
  )
}

function ListSectionEditor({
  sectionKey,
  section,
  fields,
  updateSectionItem,
  addSectionItem,
  removeSectionItem,
  moveSectionItem,
}: {
  sectionKey: SectionKey
  section: { name: string; list: ResumeItem[] }
  fields: FieldDef[]
  updateSectionItem: EditorPanelProps['updateSectionItem']
  addSectionItem: EditorPanelProps['addSectionItem']
  removeSectionItem: EditorPanelProps['removeSectionItem']
  moveSectionItem: EditorPanelProps['moveSectionItem']
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragOverRef = useRef<number | null>(null)

  const handleDragStart = (i: number) => {
    setDragIndex(i)
  }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragOverRef.current !== i) {
      dragOverRef.current = i
      setDragOverIndex(i)
    }
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      moveSectionItem(sectionKey, dragIndex, targetIndex)
      if (expandedIndex !== null) {
        if (expandedIndex === dragIndex) {
          setExpandedIndex(targetIndex)
        } else {
          let newIndex = expandedIndex
          if (expandedIndex > dragIndex) newIndex--
          if (newIndex >= targetIndex) newIndex++
          setExpandedIndex(newIndex)
        }
      }
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
    dragOverRef.current = null
  }

  return (
    <div className="p-4 space-y-3">
      {section.list.map((item, i) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`border rounded transition-all ${
            dragIndex === i
              ? 'opacity-40 border-gray-300'
              : dragOverIndex === i
                ? 'border-blue-400 shadow-sm'
                : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
            <span className="text-gray-400 cursor-grab active:cursor-grabbing mr-2 select-none">⠿</span>
            <button
              onClick={() =>
                setExpandedIndex(expandedIndex === i ? null : i)
              }
              className="text-sm font-medium text-gray-700 truncate flex-1 text-left cursor-pointer"
            >
              {stripHtml(item.title || item.paragraph || `Item ${i + 1}`)}
            </button>
            <button
              onClick={() => removeSectionItem(sectionKey, i)}
              className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-600 cursor-pointer shrink-0 ml-2"
            >
              ✕
            </button>
          </div>
          {expandedIndex === i && (
            <div className="p-3 space-y-3">
              {fields.map((field) => (
                <div key={String(field.key)}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {field.label}
                  </label>
                  {field.rich ? (
                    <QuillEditor
                      value={String(item[field.key] ?? '')}
                      onChange={(v) =>
                        updateSectionItem(sectionKey, i, {
                          [field.key]: v,
                        })
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      value={stripHtml(String(item[field.key] ?? ''))}
                      onChange={(e) =>
                        updateSectionItem(sectionKey, i, {
                          [field.key]: wrapHtml(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() => addSectionItem(sectionKey)}
        className="w-full py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:text-gray-700 cursor-pointer"
      >
        + Add
      </button>
    </div>
  )
}

const EXPERIENCE_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'subtitle1', label: 'Company' },
  { key: 'subtitle2', label: 'Period' },
  { key: 'paragraph', label: 'Description', rich: true },
]

const EDUCATION_FIELDS: FieldDef[] = [
  { key: 'title', label: 'School' },
  { key: 'subtitle', label: 'Degree / Major' },
  { key: 'paragraph', label: 'Details', rich: true },
]

const CONTACT_FIELDS: FieldDef[] = [
  { key: 'paragraph', label: 'Contact Info', rich: true },
]

const SOCIAL_FIELDS: FieldDef[] = [
  { key: 'type', label: 'Platform' },
  { key: 'link', label: 'URL' },
  { key: 'icon', label: 'Icon (linkedin / github)' },
]

const LIST_SECTIONS: {
  key: SectionKey
  title: string
  fields: FieldDef[]
}[] = [
  { key: 'experience', title: 'Experience', fields: EXPERIENCE_FIELDS },
  { key: 'education', title: 'Education', fields: EDUCATION_FIELDS },
  { key: 'contact', title: 'Contact', fields: CONTACT_FIELDS },
  { key: 'social', title: 'Social Media', fields: SOCIAL_FIELDS },
]

export function EditorPanel({
  data,
  updateAbout,
  updateSummary,
  updateSectionItem,
  addSectionItem,
  removeSectionItem,
  moveSectionItem,
}: EditorPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    about: true,
  })

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="bg-white border-l border-gray-200 h-full overflow-y-auto">
      <SectionHeader
        title="About"
        isOpen={!!openSections.about}
        onToggle={() => toggle('about')}
      />
      {openSections.about && (
        <AboutEditor about={data.user.about} updateAbout={updateAbout} />
      )}

      <SectionHeader
        title="Summary"
        isOpen={!!openSections.summary}
        onToggle={() => toggle('summary')}
      />
      {openSections.summary && (
        <SummaryEditor
          summary={data.user.summary}
          updateSummary={updateSummary}
        />
      )}

      {LIST_SECTIONS.map((s) => (
        <div key={s.key}>
          <SectionHeader
            title={s.title}
            isOpen={!!openSections[s.key]}
            onToggle={() => toggle(s.key)}
          />
          {openSections[s.key] && (
            <ListSectionEditor
              sectionKey={s.key}
              section={data.user[s.key]}
              fields={s.fields}
              updateSectionItem={updateSectionItem}
              addSectionItem={addSectionItem}
              removeSectionItem={removeSectionItem}
              moveSectionItem={moveSectionItem}
            />
          )}
        </div>
      ))}
    </div>
  )
}
