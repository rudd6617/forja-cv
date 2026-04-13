import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResumeData, ResumeItem, SectionKey } from '../types/resume'
import { SECTION_KEYS, CURRENT_RESUME_VERSION } from '../types/resume'

const STORAGE_KEY = 'forja-cv-resume'
const SAVE_DEBOUNCE_MS = 500
const HISTORY_MAX = 50
const HISTORY_DEBOUNCE_MS = 500

let saveTimer: ReturnType<typeof setTimeout> | null = null

function isValidResumeData(data: unknown): data is ResumeData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (typeof d.title !== 'string') return false
  if (!d.user || typeof d.user !== 'object') return false
  const user = d.user as Record<string, unknown>
  if (!user.about || !user.summary) return false
  for (const key of SECTION_KEYS) {
    const section = user[key] as Record<string, unknown> | undefined
    if (!section || !Array.isArray(section.list)) return false
  }
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateData(data: any): any {
  const version = typeof data.version === 'number' ? data.version : 0
  if (version >= CURRENT_RESUME_VERSION) return data

  const result = { ...data }
  if (version < 1) {
    delete result.toolbar
    result.version = CURRENT_RESUME_VERSION
  }
  return result
}

function loadFromStorage(): ResumeData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = migrateData(JSON.parse(raw))
    return isValidResumeData(parsed) ? parsed : null
  } catch {
    return null
  }
}

function debouncedSave(data: ResumeData) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, SAVE_DEBOUNCE_MS)
}

let nextId = 0
function generateId(): string {
  return `item-${Date.now()}-${nextId++}`
}

function ensureIds(data: ResumeData): ResumeData {
  let anyChanged = false
  const user = { ...data.user }

  for (const key of SECTION_KEYS) {
    const section = user[key]
    let sectionChanged = false
    const list = section.list.map((item) => {
      if (item.id) return item
      sectionChanged = true
      return { ...item, id: generateId() }
    })
    if (sectionChanged) {
      anyChanged = true
      user[key] = { ...section, list }
    }
  }

  return anyChanged ? { ...data, user } : data
}

export function useResume(initial: ResumeData, onDataChange?: (data: ResumeData) => void) {
  const [data, setDataRaw] = useState<ResumeData>(() => {
    return ensureIds(loadFromStorage() ?? initial)
  })

  const dataRef = useRef(data)
  const onDataChangeRef = useRef(onDataChange)
  const isFirstRender = useRef(true)

  // History state
  const historyRef = useRef<ResumeData[]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateCanUndoRedo = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const pushHistory = useCallback((snapshot: ResumeData) => {
    const history = historyRef.current
    const index = historyIndexRef.current

    // Truncate any redo entries
    historyRef.current = history.slice(0, index + 1)
    historyRef.current.push(snapshot)

    // Enforce max size
    if (historyRef.current.length > HISTORY_MAX) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - HISTORY_MAX)
    }

    historyIndexRef.current = historyRef.current.length - 1
    updateCanUndoRedo()
  }, [updateCanUndoRedo])

  const setData = useCallback((updater: ResumeData | ((prev: ResumeData) => ResumeData)) => {
    setDataRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!isUndoRedoRef.current) {
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
        historyTimerRef.current = setTimeout(() => {
          pushHistory(next)
        }, HISTORY_DEBOUNCE_MS)
      }
      return next
    })
  }, [pushHistory])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    // Flush any pending history push so current state is saved
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current)
      historyTimerRef.current = null
      pushHistory(dataRef.current)
    }
    if (historyIndexRef.current <= 0) return
    isUndoRedoRef.current = true
    historyIndexRef.current -= 1
    const snapshot = historyRef.current[historyIndexRef.current]
    setDataRaw(snapshot)
    updateCanUndoRedo()
    isUndoRedoRef.current = false
  }, [pushHistory, updateCanUndoRedo])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    isUndoRedoRef.current = true
    historyIndexRef.current += 1
    const snapshot = historyRef.current[historyIndexRef.current]
    setDataRaw(snapshot)
    updateCanUndoRedo()
    isUndoRedoRef.current = false
  }, [updateCanUndoRedo])

  // Initialize history with the initial state
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [dataRef.current]
      historyIndexRef.current = 0
      updateCanUndoRedo()
    }
  }, [updateCanUndoRedo])

  useEffect(() => { onDataChangeRef.current = onDataChange }, [onDataChange])

  useEffect(() => {
    dataRef.current = data
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave(data)
    onDataChangeRef.current?.(data)
  }, [data])

  const updateAbout = useCallback(
    (field: 'name' | 'jobTitle', value: string) => {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          about: { ...prev.user.about, [field]: value },
        },
      }))
    },
    [setData],
  )

  const updateSummary = useCallback(
    (field: 'paragraph' | 'hashtags', value: string | string[]) => {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          summary: { ...prev.user.summary, [field]: value },
        },
      }))
    },
    [setData],
  )

  const updateSectionItem = useCallback(
    (section: SectionKey, index: number, item: Partial<ResumeItem>) => {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [section]: {
            ...prev.user[section],
            list: prev.user[section].list.map((existing, i) =>
              i === index ? { ...existing, ...item } : existing,
            ),
          },
        },
      }))
    },
    [setData],
  )

  const addSectionItem = useCallback((section: SectionKey) => {
    const blank: ResumeItem = {
      id: generateId(),
      isShow: true,
      isCollapsed: false,
      isEditing: false,
      title: '',
      subtitle: '',
      subtitle1: '',
      subtitle2: '',
      paragraph: '',
    }
    setData((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        [section]: {
          ...prev.user[section],
          list: [...prev.user[section].list, blank],
        },
      },
    }))
  }, [setData])

  const removeSectionItem = useCallback(
    (section: SectionKey, index: number) => {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [section]: {
            ...prev.user[section],
            list: prev.user[section].list.filter((_, i) => i !== index),
          },
        },
      }))
    },
    [setData],
  )

  const moveSectionItem = useCallback(
    (section: SectionKey, from: number, to: number) => {
      setData((prev) => {
        const list = [...prev.user[section].list]
        const [item] = list.splice(from, 1)
        list.splice(to, 0, item)
        return {
          ...prev,
          user: { ...prev.user, [section]: { ...prev.user[section], list } },
        }
      })
    },
    [setData],
  )

  const toggleSectionVisibility = useCallback(
    (section: 'about' | 'summary' | SectionKey) => {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [section]: {
            ...prev.user[section],
            isShow: !prev.user[section].isShow,
          },
        },
      }))
    },
    [setData],
  )

  const exportData = useCallback((): string => {
    return JSON.stringify(dataRef.current)
  }, [])

  const importData = useCallback((json: string) => {
    let parsed: unknown
    try {
      parsed = migrateData(JSON.parse(json))
    } catch {
      throw new Error('Import failed: Invalid JSON')
    }
    if (!isValidResumeData(parsed)) {
      throw new Error('Import failed: Invalid resume format')
    }
    setData(ensureIds(parsed))
  }, [setData])

  const resetToInitial = useCallback(() => {
    setData(ensureIds(initial))
  }, [initial, setData])

  const loadData = useCallback((resumeData: ResumeData) => {
    setData(ensureIds(migrateData(resumeData)))
  }, [setData])

  return {
    data,
    updateAbout,
    updateSummary,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    moveSectionItem,
    toggleSectionVisibility,
    exportData,
    importData,
    resetToInitial,
    loadData,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
