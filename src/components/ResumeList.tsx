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

  const refresh = useCallback(async () => {
    if (!idToken) return
    setLoading(true)
    try {
      const list = await api.listResumes(idToken)
      setResumes(list)
    } catch {
      setResumes([])
    } finally {
      setLoading(false)
    }
  }, [idToken])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = async (id: string) => {
    if (!idToken) return
    try {
      await api.deleteResume(idToken, id)
      onDelete(id)
      refresh()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="p-4 space-y-2">
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
