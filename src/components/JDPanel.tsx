import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResumeData } from '../types/resume'
import type { AnalysisResult, Suggestion } from '../types/analysis'
import { analyzeJD, mockAnalyzeJD } from '../services/analyze'
import { useAuth } from '../hooks/useAuth'

const HISTORY_KEY = 'cv-rabbit-jd-history'
const MAX_HISTORY = 20

interface HistoryEntry {
  jd: string
  result: AnalysisResult
  date: string
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function scoreColorClass(score: number): string {
  if (score >= 70) return 'text-green-700'
  if (score >= 40) return 'text-yellow-700'
  return 'text-red-700'
}

interface JDPanelProps {
  data: ResumeData
  onApplySuggestion: (suggestion: Suggestion) => void
}

function scoreBgClass(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200'
  if (score >= 40) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${scoreColorClass(score)} ${scoreBgClass(score)}`}
    >
      ATS Match: {score}%
    </div>
  )
}

function KeywordList({
  title,
  keywords,
  variant,
}: {
  title: string
  keywords: string[]
  variant: 'matched' | 'missing'
}) {
  if (keywords.length === 0) return null
  const tagClass =
    variant === 'matched'
      ? 'bg-green-50 text-green-700'
      : 'bg-red-50 text-red-700'

  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-500 mb-2">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((k) => (
          <span key={k} className={`px-2 py-0.5 rounded text-xs ${tagClass}`}>
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onApply,
  applied,
}: {
  suggestion: Suggestion
  onApply: () => void
  applied: boolean
}) {
  const label =
    suggestion.section === 'summary'
      ? 'Summary'
      : `Experience #${(suggestion.index ?? 0) + 1}`

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <button
          onClick={onApply}
          disabled={applied}
          className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
            applied
              ? 'bg-gray-100 text-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {applied ? 'Applied' : 'Apply'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">{suggestion.reason}</p>
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-red-500">Original:</span>
          <p className="text-xs text-gray-600 mt-0.5 line-through">
            {suggestion.original.substring(0, 150)}
            {suggestion.original.length > 150 ? '...' : ''}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-green-600">Suggested:</span>
          <p className="text-xs text-gray-800 mt-0.5">
            {suggestion.suggested.substring(0, 200)}
            {suggestion.suggested.length > 200 ? '...' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export function JDPanel({ data, onApplySuggestion }: JDPanelProps) {
  const { idToken } = useAuth()
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set())
  const [useMock, setUseMock] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    saveHistory(history)
  }, [history])

  const handleAnalyze = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setAppliedIndices(new Set())

    try {
      const res = useMock
        ? await mockAnalyzeJD(jdText, data)
        : await analyzeJD(idToken!, jdText, data)
      setResult(res)
      setHistory((prev) => [
        { jd: jdText.trim(), result: res, date: new Date().toISOString() },
        ...prev.filter((h) => h.jd !== jdText.trim()),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (suggestion: Suggestion, index: number) => {
    onApplySuggestion(suggestion)
    setAppliedIndices((prev) => new Set(prev).add(index))
  }

  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setJdText(entry.jd)
    setResult(entry.result)
    setAppliedIndices(new Set())
    setShowHistory(false)
    setError(null)
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return (
    <div className="p-4 space-y-4">
      <label className="flex items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={useMock}
          onChange={(e) => setUseMock(e.target.checked)}
          className="rounded"
        />
        Mock mode (no vLLM required)
      </label>

      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste job description here..."
        rows={8}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
      />

      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={loading || !jdText.trim()}
          className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-default"
        >
          {loading ? 'Analyzing...' : 'Analyze JD'}
        </button>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            History ({history.length})
          </button>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500">Analysis History</span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {history.map((entry, i) => (
              <button
                key={entry.date}
                onClick={() => handleLoadHistory(entry)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                  i < history.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 truncate max-w-[70%]">
                    {entry.jd.substring(0, 60)}...
                  </span>
                  <span className={`text-xs font-semibold ${scoreColorClass(entry.result.score)}`}>
                    {entry.result.score}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <ScoreBadge score={result.score} />

          <KeywordList
            title="Matched Keywords"
            keywords={result.matchedKeywords}
            variant="matched"
          />
          <KeywordList
            title="Missing Keywords"
            keywords={result.missingKeywords}
            variant="missing"
          />

          {result.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">
                Suggestions
              </h4>
              {result.suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onApply={() => handleApply(s, i)}
                  applied={appliedIndices.has(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
