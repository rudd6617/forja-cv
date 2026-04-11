import { useCallback, useEffect, useState } from 'react'
import type { ResumeData } from './types/resume'
import type { Suggestion } from './types/analysis'
import { wrapHtml } from './utils/html'
import { useResume } from './hooks/useResume'
import { ResumePreview } from './components/ResumePreview'
import { EditorPanel } from './components/EditorPanel'
import { JDPanel } from './components/JDPanel'
import { Toolbar } from './components/Toolbar'

export default function App() {
  const [initial, setInitial] = useState<ResumeData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/Rudolf.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load resume: ${res.status}`)
        return res.json()
      })
      .then(setInitial)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    )
  }

  return <AppContent initial={initial} />
}

type Tab = 'edit' | 'jd'

function AppContent({ initial }: { initial: ResumeData }) {
  const [activeTab, setActiveTab] = useState<Tab>('edit')

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
        onExportCvicream={exportData}
        onImportCvicream={importData}
        onReset={resetToInitial}
      />
      <div className="pt-14 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 lg:p-6">
          <ResumePreview data={data} />
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
