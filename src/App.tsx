import { useCallback, useEffect, useState } from 'react'
import type { ResumeData } from './types/resume'
import type { Suggestion } from './types/analysis'
import type { FontValue, ColorValue, LayoutValue } from './types/theme'
import { wrapHtml } from './utils/html'
import { useResume } from './hooks/useResume'
import { ResumePreview } from './components/ResumePreview'
import { EditorPanel } from './components/EditorPanel'
import { JDPanel } from './components/JDPanel'
import { Toolbar } from './components/Toolbar'

const EMPTY_RESUME: ResumeData = {
  title: 'New Resume',
  toolbar: {
    currentState: {
      fontFamily: 'font-gill-sans',
      layout: 'layout-right',
      color: 'default',
      fontSize: 'default',
      topPanelWidth: [75, 25],
      leftPanelWidth: [25, 75],
      rightPanelWidth: [75, 25],
    },
    noteList: [],
  },
  user: {
    template: 1,
    splitIndex: 2,
    about: { isShow: true, isEditing: false, name: '<p>Your Name</p>', jobTitle: '<p>Job Title</p>' },
    summary: { isShow: true, isEditing: false, hashtags: [], paragraph: '' },
    experience: { isShow: true, name: 'EXPERIENCE', list: [], isEditing: false },
    project: { isShow: false, name: 'PROJECT', list: [], isEditing: false },
    skill: { isShow: false, name: 'SKILL', list: [], isEditing: false },
    education: { isShow: true, name: 'EDUCATION', list: [], isEditing: false },
    certificate: { isShow: false, name: 'CERTIFICATE', list: [], isEditing: false },
    contact: { isShow: true, name: 'CONTACT', list: [], isEditing: false },
    social: { isShow: true, name: 'SOCIAL MEDIA', list: [], isEditing: false },
  },
}

export default function App() {
  return <AppContent initial={EMPTY_RESUME} />
}

type Tab = 'edit' | 'jd'

function AppContent({ initial }: { initial: ResumeData }) {
  const [activeTab, setActiveTab] = useState<Tab>('edit')
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

  const {
    data,
    updateAbout,
    updateSummary,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    moveSectionItem,
    exportData,
    importData,
    resetToInitial,
  } = useResume(initial)

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

  return (
    <>
      <Toolbar
        fontFamily={fontFamily}
        colorTheme={colorTheme}
        layout={layout}
        onFontChange={setFontFamily}
        onColorChange={setColorTheme}
        onLayoutChange={setLayout}
        onExportCvicream={exportData}
        onImportCvicream={importData}
        onReset={resetToInitial}
      />
      <div className="pt-14 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 lg:p-6">
          <ResumePreview data={data} fontFamily={fontFamily} colorTheme={colorTheme} layout={layout} />
        </div>

        <div className="no-print w-full lg:w-[400px] shrink-0 flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="flex border-b border-gray-200 shrink-0">
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
            {activeTab === 'edit' ? (
              <EditorPanel
                data={data}
                updateAbout={updateAbout}
                updateSummary={updateSummary}
                updateSectionItem={updateSectionItem}
                addSectionItem={addSectionItem}
                removeSectionItem={removeSectionItem}
                moveSectionItem={moveSectionItem}
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
