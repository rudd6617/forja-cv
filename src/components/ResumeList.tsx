import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as api from '../services/resumeApi'
import type { ResumeSummary } from '../services/resumeApi'

interface ResumeListProps {
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function ResumeList({ currentId, onSelect, onNew, onDelete }: ResumeListProps) {
  const { idToken } = useAuth()
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!idToken) return
    setLoading(true)
    setError(null)
    try {
      const list = await api.listResumes(idToken)
      setResumes(list)
    } catch (err) {
      setResumes([])
      setError(err instanceof Error ? err.message : 'Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, [idToken])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = async (id: string) => {
    if (!idToken) return
    if (!confirm('Delete this resume? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteResume(idToken, id)
      onDelete(id)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center px-3 py-2 rounded border border-gray-100">
            <div className="space-y-1.5 min-w-0">
              <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={onNew}
        className="w-full py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:text-gray-700 cursor-pointer"
      >
        + New Resume
      </button>
      {resumes.map((r) => (
        <div
          key={r.id}
          className={`flex items-center justify-between px-3 py-2 rounded border cursor-pointer ${
            r.id === currentId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => onSelect(r.id)}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
            <div className="text-xs text-gray-500">
              {new Date(r.updated_at + 'Z').toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(r.id)
            }}
            className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
      {resumes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No resumes yet</p>
      )}
    </div>
  )
}
