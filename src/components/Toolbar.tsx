import { useRef } from 'react'
import {
  FONT_OPTIONS,
  COLOR_THEMES,
  LAYOUT_OPTIONS,
  type FontValue,
  type ColorValue,
  type LayoutValue,
} from '../types/theme'

interface ToolbarProps {
  fontFamily: FontValue
  colorTheme: ColorValue
  layout: LayoutValue
  onFontChange: (font: FontValue) => void
  onColorChange: (color: ColorValue) => void
  onLayoutChange: (layout: LayoutValue) => void
  onExportCvicream: () => string
  onImportCvicream: (json: string) => void
  onReset: () => void
}

function LayoutIcon({ type, active }: { type: LayoutValue; active: boolean }) {
  const cls = `w-[18px] h-[22px] rounded-sm border ${active ? 'border-gray-900' : 'border-gray-400'}`
  const fill = active ? '#111827' : '#9ca3af'
  const bg = active ? '#e5e7eb' : '#f3f4f6'

  return (
    <svg viewBox="0 0 18 22" className={cls}>
      <rect x="0" y="0" width="18" height="5" fill={fill} rx="1" />
      {type === 'right-sidebar' && (
        <>
          <rect x="0" y="6" width="12" height="16" fill={bg} rx="1" />
          <rect x="13" y="6" width="5" height="16" fill={fill} opacity="0.4" rx="1" />
        </>
      )}
      {type === 'left-sidebar' && (
        <>
          <rect x="0" y="6" width="5" height="16" fill={fill} opacity="0.4" rx="1" />
          <rect x="6" y="6" width="12" height="16" fill={bg} rx="1" />
        </>
      )}
      {type === 'top-header' && (
        <>
          <rect x="0" y="6" width="18" height="16" fill={bg} rx="1" />
          <rect x="10" y="0" width="8" height="5" fill={bg} rx="1" />
        </>
      )}
      {type === 'single-column' && (
        <rect x="2" y="6" width="14" height="16" fill={bg} rx="1" />
      )}
    </svg>
  )
}

export function Toolbar({
  fontFamily,
  colorTheme,
  layout,
  onFontChange,
  onColorChange,
  onLayoutChange,
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
    if (file.size > 1_000_000) {
      alert('File too large (max 1 MB)')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        onImportCvicream(reader.result as string)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <h1 className="text-base lg:text-lg font-bold text-gray-900">CV Cream</h1>
        <div className="flex items-center gap-1 lg:gap-3">
          <div className="flex items-center gap-0.5">
            {LAYOUT_OPTIONS.map((l) => (
              <button
                key={l.value}
                onClick={() => onLayoutChange(l.value)}
                title={l.label}
                className="p-1 cursor-pointer rounded hover:bg-gray-100"
              >
                <LayoutIcon type={l.value} active={layout === l.value} />
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 hidden lg:block" />

          <select
            value={fontFamily}
            onChange={(e) => onFontChange(e.target.value as FontValue)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded cursor-pointer bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => onColorChange(t.value)}
                title={t.label}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                  colorTheme === t.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: t.accent }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 hidden lg:block" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 lg:px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
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
            className="px-2 lg:px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onReset}
            className="px-2 lg:px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 lg:px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
