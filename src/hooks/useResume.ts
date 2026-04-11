import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResumeData, ResumeItem, SectionKey } from '../types/resume'
import { SECTION_KEYS } from '../types/resume'

const STORAGE_KEY = 'cv-rabbit-resume'
const SAVE_DEBOUNCE_MS = 500

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

function loadFromStorage(): ResumeData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
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
  const [data, setData] = useState<ResumeData>(() => {
    return ensureIds(loadFromStorage() ?? initial)
  })

  const dataRef = useRef(data)
  const onDataChangeRef = useRef(onDataChange)
  const isFirstRender = useRef(true)

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
    [],
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
    [],
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
    [],
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
  }, [])

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
    [],
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
    [],
  )

  const exportData = useCallback((): string => {
    return JSON.stringify(dataRef.current)
  }, [])

  const importData = useCallback((json: string) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new Error('Import failed: Invalid JSON')
    }
    if (!isValidResumeData(parsed)) {
      throw new Error('Import failed: Invalid resume format')
    }
    setData(ensureIds(parsed))
  }, [])

  const resetToInitial = useCallback(() => {
    setData(ensureIds(initial))
  }, [initial])

  const loadData = useCallback((resumeData: ResumeData) => {
    setData(ensureIds(resumeData))
  }, [])

  return {
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
    loadData,
  }
}
