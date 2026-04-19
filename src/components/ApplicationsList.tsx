import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as api from '../services/applicationApi'
import { getResume } from '../services/resumeApi'
import type { ApplicationStatus, ApplicationSummary } from '../types/application'
import { APPLICATION_STATUSES } from '../types/application'
import type { ResumeData } from '../types/resume'

interface ApplicationsListProps {
  onLoadSnapshot: (data: ResumeData, meta: { company: string; position: string }) => void
}

type SortField = 'company' | 'position' | 'status' | 'score' | 'updated_at'
type SortDir = 'asc' | 'desc'

const statusColors: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  applied: 'bg-blue-100 text-blue-700',
  interview: 'bg-yellow-100 text-yellow-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

const statusOrder = Object.fromEntries(
  APPLICATION_STATUSES.map((s, i) => [s, i]),
) as Record<ApplicationStatus, number>

const SORTABLE_COLUMNS: { field: SortField; label: string; defaultDir: SortDir }[] = [
  { field: 'company', label: 'Company', defaultDir: 'asc' },
  { field: 'position', label: 'Position', defaultDir: 'asc' },
  { field: 'status', label: 'Status', defaultDir: 'asc' },
  { field: 'score', label: 'Score', defaultDir: 'desc' },
  { field: 'updated_at', label: 'Updated', defaultDir: 'desc' },
]

function scoreClass(score: number | null): string {
  if (score == null) return 'text-gray-400'
  if (score >= 70) return 'text-green-700'
  if (score >= 40) return 'text-yellow-700'
  return 'text-red-700'
}

function compareValues(
  a: ApplicationSummary,
  b: ApplicationSummary,
  field: SortField,
): number {
  switch (field) {
    case 'company': return a.company.localeCompare(b.company)
    case 'position': return a.position.localeCompare(b.position)
    case 'status': return statusOrder[a.status] - statusOrder[b.status]
    case 'score': {
      const sa = a.score ?? -1
      const sb = b.score ?? -1
      return sa - sb
    }
    case 'updated_at': return a.updated_at.localeCompare(b.updated_at)
  }
}

export function ApplicationsList({ onLoadSnapshot }: ApplicationsListProps) {
  const { idToken } = useAuth()
  const [items, setItems] = useState<ApplicationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const displayItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? items.filter(
          (a) =>
            a.company.toLowerCase().includes(q) ||
            a.position.toLowerCase().includes(q),
        )
      : items
    const dir = sortDir === 'desc' ? -1 : 1
    return [...filtered].sort((a, b) => compareValues(a, b, sortField) * dir)
  }, [items, search, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(SORTABLE_COLUMNS.find((c) => c.field === field)!.defaultDir)
    }
  }

  const sortArrow = (field: SortField) =>
    field === sortField ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const refresh = useCallback(async () => {
    if (!idToken) return
    setLoading(true)
    setError(null)
    try {
      const list = await api.listApplications(
        idToken,
        filter === 'all' ? undefined : filter,
      )
      setItems(list)
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [idToken, filter])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = async (id: string) => {
    if (!idToken) return
    if (!confirm('Delete this application? This cannot be undone.')) return
    try {
      await api.deleteApplication(idToken, id)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    if (!idToken) return
    try {
      await api.updateApplication(idToken, id, { status })
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleLoad = async (id: string, company: string, position: string) => {
    if (!idToken) return
    setError(null)
    try {
      const app = await api.getApplication(idToken, id)
      const raw = app.resume_snapshot ?? (await getResume(idToken, app.resume_id)).data
      const parsed = JSON.parse(raw) as ResumeData
      onLoadSnapshot(parsed, { company, position })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshot')
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-gray-500">Filter</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ApplicationStatus | 'all')}
          className="text-xs px-2 py-1 border border-gray-300 rounded"
        >
          <option value="all">All</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or position"
          className="text-xs px-2 py-1 border border-gray-300 rounded flex-1 min-w-[160px]"
          aria-label="Search applications"
        />
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No applications yet. Analyze a JD and click "Save as Application" to track it here.
        </p>
      ) : displayItems.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No applications match your search.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                {SORTABLE_COLUMNS.map((col) => (
                  <th key={col.field} className="py-2 pr-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.field)}
                      className="cursor-pointer hover:text-gray-900"
                    >
                      {col.label}{sortArrow(col.field)}
                    </button>
                  </th>
                ))}
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-900">{a.company}</td>
                  <td className="py-2 pr-3 text-gray-700">{a.position}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value as ApplicationStatus)}
                      className={`text-xs px-2 py-0.5 rounded border-0 ${statusColors[a.status]}`}
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className={`py-2 pr-3 tabular-nums font-medium ${scoreClass(a.score)}`}>
                    {a.score ?? '—'}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {new Date(a.updated_at + 'Z').toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleLoad(a.id, a.company, a.position)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 cursor-pointer"
                      title="Load saved resume version"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
