import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResumeData } from '../types/resume'
import type { AnalysisResult, ScoreBreakdown, Suggestion } from '../types/analysis'
import { analyzeJD, mockAnalyzeJD } from '../services/analyze'
import { stripHtml } from '../utils/html'
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

const scoreStyles = {
  high: { text: 'text-green-700', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' },
  mid:  { text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', bar: 'bg-yellow-500' },
  low:  { text: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' },
} as const

function scoreLevel(score: number): keyof typeof scoreStyles {
  if (score >= 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

interface JDPanelProps {
  data: ResumeData
  onApplySuggestion: (suggestion: Suggestion) => void
}

function ScoreBadge({ score, previousScore }: { score: number; previousScore?: number }) {
  const diff = previousScore != null ? score - previousScore : null
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${scoreStyles[scoreLevel(score)].text} ${scoreStyles[scoreLevel(score)].bg}`}
    >
      ATS Match: {score}%
      {diff != null && diff !== 0 && (
        <span className={`text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
          ({diff > 0 ? '+' : ''}{diff})
        </span>
      )}
    </div>
  )
}

function ScoreBreakdownBar({ breakdown }: { breakdown: ScoreBreakdown }) {
  const items = [
    { label: 'Skill Match', value: breakdown.skillMatch },
    { label: 'Experience', value: breakdown.experienceRelevance },
    { label: 'Keywords', value: breakdown.keywordCoverage },
  ]
  return (
    <div className="space-y-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
            <span>{label}</span>
            <span className="font-medium">{value}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreStyles[scoreLevel(value)].bar}`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ))}
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
  stale,
}: {
  suggestion: Suggestion
  onApply: () => void
  applied: boolean
  stale: boolean
}) {
  const label =
    suggestion.section === 'summary'
      ? 'Summary'
      : `Experience #${(suggestion.index ?? 0) + 1}`

  return (
    <div className={`border rounded-lg p-3 mb-3 ${stale ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <div className="flex items-center gap-1.5">
          {stale && !applied && (
            <span className="text-[10px] text-yellow-600">changed</span>
          )}
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

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular-nums">{elapsed}s</span>
}

function getCurrentContent(data: ResumeData, suggestion: Suggestion): string {
  if (suggestion.section === 'summary') {
    return stripHtml(data.user.summary.paragraph)
  }
  if (suggestion.section === 'experience' && suggestion.index != null) {
    const entry = data.user.experience.list.filter((e) => e.isShow)[suggestion.index]
    return entry ? stripHtml(entry.paragraph ?? '') : ''
  }
  return ''
}

export function JDPanel({ data, onApplySuggestion }: JDPanelProps) {
  const { idToken } = useAuth()
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const isFirstRender = useRef(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    saveHistory(history)
  }, [history])

  const handleAnalyze = async () => {
    if (!jdText.trim()) return
    if (result) setPreviousScore(result.score)
    setLoading(true)
    setError(null)
    setResult(null)
    setAppliedIndices(new Set())

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const useMock = !idToken
      const res = useMock
        ? await mockAnalyzeJD(jdText, data)
        : await analyzeJD(idToken!, jdText, data, controller.signal)
      if (controller.signal.aborted) return
      setResult(res)
      setHistory((prev) => [
        { jd: jdText.trim(), result: res, date: new Date().toISOString() },
        ...prev.filter((h) => h.jd !== jdText.trim()),
      ])
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
  }

  const handleApply = (suggestion: Suggestion, index: number) => {
    onApplySuggestion(suggestion)
    setAppliedIndices((prev) => new Set(prev).add(index))
  }

  const handleApplyAll = () => {
    if (!result) return
    const next = new Set(appliedIndices)
    result.suggestions.forEach((s, i) => {
      if (!next.has(i)) {
        onApplySuggestion(s)
        next.add(i)
      }
    })
    setAppliedIndices(next)
  }

  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setJdText(entry.jd)
    setResult(entry.result)
    setPreviousScore(null)
    setAppliedIndices(new Set())
    setShowHistory(false)
    setError(null)
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const hasUnapplied = result
    ? result.suggestions.some((_, i) => !appliedIndices.has(i))
    : false

  const someApplied = appliedIndices.size > 0

  return (
    <div className="p-4 space-y-4">
      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste job description here..."
        rows={8}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
      />

      <div className="flex gap-2">
        {loading ? (
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Cancel</span>
            <ElapsedTimer />
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!jdText.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            {someApplied ? 'Re-analyze' : 'Analyze JD'}
          </button>
        )}
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
          <ScoreBadge score={result.score} previousScore={previousScore ?? undefined} />

          {result.scoreBreakdown && (
            <ScoreBreakdownBar breakdown={result.scoreBreakdown} />
          )}

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
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500">
                  Suggestions
                </h4>
                {hasUnapplied && result.suggestions.length > 1 && (
                  <button
                    onClick={handleApplyAll}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Apply All
                  </button>
                )}
              </div>
              {result.suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onApply={() => handleApply(s, i)}
                  applied={appliedIndices.has(i)}
                  stale={getCurrentContent(data, s) !== s.original}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
