import { useCallback, useEffect, useRef, useState, createElement } from 'react'
import type { ResumeData } from './types/resume'
import { downloadBlob } from './utils/download'
import type { Suggestion } from './types/analysis'
import type { FontValue, ColorValue, LayoutValue } from './types/theme'
import { wrapHtml } from './utils/html'
import { useResume } from './hooks/useResume'
import { useAuth } from './hooks/useAuth'
import { ResumePreview } from './components/ResumePreview'
import { EditorPanel } from './components/EditorPanel'
import { JDPanel } from './components/JDPanel'
import { ResumeList } from './components/ResumeList'
import { Toolbar } from './components/Toolbar'
import * as api from './services/resumeApi'
import { ConflictError } from './services/resumeApi'

const EMPTY_RESUME: ResumeData = {
  version: 1,
  title: 'New Resume',
  user: {
    template: 1,
    splitIndex: 2,
    about: { isShow: true, isEditing: false, name: '<p>Your Name</p>', jobTitle: '<p>Job Title</p>' },
    summary: { isShow: true, isEditing: false, hashtags: [], paragraph: '' },
    experience: { isShow: true, name: 'EXPERIENCE', list: [], isEditing: false },
    project: { isShow: true, name: 'PROJECT', list: [], isEditing: false },
    skill: { isShow: true, name: 'SKILL', list: [], isEditing: false },
    education: { isShow: true, name: 'EDUCATION', list: [], isEditing: false },
    certificate: { isShow: true, name: 'CERTIFICATE', list: [], isEditing: false },
    contact: { isShow: true, name: 'CONTACT', list: [], isEditing: false },
    social: { isShow: true, name: 'SOCIAL MEDIA', list: [], isEditing: false },
  },
}

export default function App() {
  return <AppContent />
}

type Tab = 'edit' | 'jd' | 'resumes'

const SYNC_DEBOUNCE_MS = 2000

function AppContent() {
  const { user, idToken } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('edit')
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null)
  const [resumeListKey, setResumeListKey] = useState(0)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [fontFamily, setFontFamily] = useState<FontValue>(
    () => (localStorage.getItem('cv-font') as FontValue) || 'gill-sans',
  )
  const [colorTheme, setColorTheme] = useState<ColorValue>(
    () => (localStorage.getItem('cv-color') as ColorValue) || 'default',
  )
  const [layout, setLayout] = useState<LayoutValue>(
    () => (localStorage.getItem('cv-layout') as LayoutValue) || 'right-sidebar',
  )

  useEffect(() => { localStorage.setItem('cv-font', fontFamily) }, [fontFamily])
  useEffect(() => { localStorage.setItem('cv-color', colorTheme) }, [colorTheme])
  useEffect(() => { localStorage.setItem('cv-layout', layout) }, [layout])

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncCounterRef = useRef(0)
  const updatedAtRef = useRef<string | null>(null)
  const idTokenRef = useRef(idToken)
  const currentResumeIdRef = useRef(currentResumeId)

  useEffect(() => { idTokenRef.current = idToken }, [idToken])
  useEffect(() => { currentResumeIdRef.current = currentResumeId }, [currentResumeId])

  const handleDataChange = useCallback((resumeData: ResumeData) => {
    if (!idTokenRef.current || !currentResumeIdRef.current) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    const token = idTokenRef.current
    const id = currentResumeIdRef.current
    const requestId = ++syncCounterRef.current
    syncTimerRef.current = setTimeout(() => {
      setSyncStatus('saving')
      api.updateResume(token, id, {
        title: resumeData.title,
        data: JSON.stringify(resumeData),
        updated_at: updatedAtRef.current ?? undefined,
      })
        .then((res) => {
          if (syncCounterRef.current === requestId) setSyncStatus('saved')
          updatedAtRef.current = res.updated_at
        })
        .catch((err) => {
          if (syncCounterRef.current !== requestId) return
          if (err instanceof ConflictError) {
            setSyncStatus('syncing')
            // Refetch latest updated_at and retry once
            api.getResume(token, id).then((record) => {
              updatedAtRef.current = record.updated_at
              return api.updateResume(token, id, {
                title: resumeData.title,
                data: JSON.stringify(resumeData),
                updated_at: record.updated_at,
              })
            }).then((res) => {
              updatedAtRef.current = res.updated_at
              setSyncStatus('saved')
            }).catch(() => { setSyncStatus('error') })
          } else {
            setSyncStatus('error')
          }
        })
    }, SYNC_DEBOUNCE_MS)
  }, [])

  const {
    data,
    updateAbout,
    updateSummary,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    moveSectionItem,
    toggleSectionVisibility,
    exportData,
    importData,
    resetToInitial,
    loadData,
    undo,
    redo,
  } = useResume(EMPTY_RESUME, user ? handleDataChange : undefined)

  // Undo/redo keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
  // Skip when focus is inside a Quill editor (it handles its own undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('.ql-editor')) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const handleSelectResume = useCallback(async (id: string) => {
    if (!idToken) return
    try {
      const record = await api.getResume(idToken, id)
      const parsed = JSON.parse(record.data) as ResumeData
      updatedAtRef.current = record.updated_at
      loadData(parsed)
      setCurrentResumeId(id)
      setActiveTab('edit')
    } catch {
      setSyncStatus('error')
    }
  }, [idToken, loadData])

  const handleNewResume = useCallback(async () => {
    if (!idToken) return
    try {
      const { id } = await api.createResume(
        idToken,
        'New Resume',
        JSON.stringify(EMPTY_RESUME),
      )
      updatedAtRef.current = null // freshly created, server sets default
      loadData(EMPTY_RESUME)
      setCurrentResumeId(id)
      setResumeListKey((k) => k + 1)
      setActiveTab('edit')
    } catch {
      setSyncStatus('error')
    }
  }, [idToken, loadData])

  const handleDeleteResume = useCallback((id: string) => {
    if (id === currentResumeId) {
      loadData(EMPTY_RESUME)
      setCurrentResumeId(null)
    }
    setResumeListKey((k) => k + 1)
  }, [currentResumeId, loadData])

  const handleApplySuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.section === 'summary') {
        updateSummary('paragraph', wrapHtml(suggestion.suggested))
      } else if (suggestion.section === 'experience' && suggestion.index != null) {
        updateSectionItem('experience', suggestion.index, {
          paragraph: wrapHtml(suggestion.suggested),
        })
      }
    },
    [updateSummary, updateSectionItem],
  )

  const handleExportPDF = useCallback(async () => {
    const [{ pdf }, { PdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./components/pdf/PdfDocument'),
    ])
    // pdf() expects ReactElement<DocumentProps>, but DocumentProps is not exported from @react-pdf/renderer
    const blob = await pdf(
      createElement(PdfDocument, { data, fontFamily, colorTheme, layout }) as React.ReactElement<any>,
    ).toBlob()
    downloadBlob(blob, `${data.title || 'resume'}.pdf`)
  }, [data, fontFamily, colorTheme, layout])

  const showResumesTab = !!user

  return (
    <>
      <Toolbar
        fontFamily={fontFamily}
        colorTheme={colorTheme}
        layout={layout}
        syncStatus={user ? syncStatus : null}
        onFontChange={setFontFamily}
        onColorChange={setColorTheme}
        onLayoutChange={setLayout}
        onExportPDF={handleExportPDF}
        onExportCvicream={exportData}
        onImportCvicream={importData}
        onReset={resetToInitial}
      />
      <div className="pt-14 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 lg:p-6">
          <ResumePreview data={data} fontFamily={fontFamily} colorTheme={colorTheme} layout={layout} />
        </div>

        <div className="w-full lg:w-[400px] shrink-0 flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="flex border-b border-gray-200 shrink-0">
            {showResumesTab && (
              <button
                onClick={() => setActiveTab('resumes')}
                className={`flex-1 py-3 text-sm font-medium cursor-pointer ${
                  activeTab === 'resumes'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Resumes
              </button>
            )}
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 text-sm font-medium cursor-pointer ${
                activeTab === 'edit'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab('jd')}
              className={`flex-1 py-3 text-sm font-medium cursor-pointer ${
                activeTab === 'jd'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JD Analysis
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'resumes' && showResumesTab ? (
              <ResumeList
                key={resumeListKey}
                currentId={currentResumeId}
                onSelect={handleSelectResume}
                onNew={handleNewResume}
                onDelete={handleDeleteResume}
              />
            ) : activeTab === 'edit' ? (
              <EditorPanel
                data={data}
                updateAbout={updateAbout}
                updateSummary={updateSummary}
                updateSectionItem={updateSectionItem}
                addSectionItem={addSectionItem}
                removeSectionItem={removeSectionItem}
                moveSectionItem={moveSectionItem}
                toggleSectionVisibility={toggleSectionVisibility}
              />
            ) : (
              <JDPanel data={data} onApplySuggestion={handleApplySuggestion} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
