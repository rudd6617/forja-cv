import { useState } from 'react'
import type { ResumeData } from '../types/resume'
import type { AnalysisResult, Suggestion } from '../types/analysis'
import { analyzeJD, mockAnalyzeJD } from '../services/analyze'

interface JDPanelProps {
  data: ResumeData
  onApplySuggestion: (suggestion: Suggestion) => void
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-green-700 bg-green-50 border-green-200'
      : score >= 40
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${color}`}
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
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(
    new Set(),
  )
  const [useMock, setUseMock] = useState(true)

  const handleAnalyze = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setAppliedIndices(new Set())

    try {
      const fn = useMock ? mockAnalyzeJD : analyzeJD
      const res = await fn(jdText, data)
      setResult(res)
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

      <button
        onClick={handleAnalyze}
        disabled={loading || !jdText.trim()}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-default"
      >
        {loading ? 'Analyzing...' : 'Analyze JD'}
      </button>

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
