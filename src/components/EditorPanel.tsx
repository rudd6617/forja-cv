import { useState } from 'react'
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

  return (
    <div className="p-4 space-y-3">
      {section.list.map((item, i) => (
        <div key={item.id} className="border border-gray-200 rounded">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
            <button
              onClick={() =>
                setExpandedIndex(expandedIndex === i ? null : i)
              }
              className="text-sm font-medium text-gray-700 truncate flex-1 text-left cursor-pointer"
            >
              {stripHtml(item.title || item.paragraph || `Item ${i + 1}`)}
            </button>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => moveSectionItem(sectionKey, i, i - 1)}
                disabled={i === 0}
                className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                ↑
              </button>
              <button
                onClick={() => moveSectionItem(sectionKey, i, i + 1)}
                disabled={i === section.list.length - 1}
                className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                ↓
              </button>
              <button
                onClick={() => removeSectionItem(sectionKey, i)}
                className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
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
