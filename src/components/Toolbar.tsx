import { useRef } from 'react'

interface ToolbarProps {
  onExportCvicream: () => string
  onImportCvicream: (json: string) => void
  onReset: () => void
}

export function Toolbar({
  onExportCvicream,
  onImportCvicream,
  onReset,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportPDF = () => {
    window.print()
  }

  const handleExportFile = () => {
    const json = onExportCvicream()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onImportCvicream(reader.result as string)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <h1 className="text-base lg:text-lg font-bold text-gray-900">CV Cream</h1>
        <div className="flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.cvicream"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleExportFile}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
