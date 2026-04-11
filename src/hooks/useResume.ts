import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResumeData, ResumeItem, SectionKey } from '../types/resume'

const STORAGE_KEY = 'cv-cream-resume'
const SAVE_DEBOUNCE_MS = 500

let saveTimer: ReturnType<typeof setTimeout> | null = null

function loadFromStorage(): ResumeData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ResumeData
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
  const sections: SectionKey[] = [
    'experience', 'education', 'contact', 'social',
    'project', 'skill', 'certificate',
  ]
  let changed = false
  const user = { ...data.user }

  for (const key of sections) {
    const section = user[key]
    const list = section.list.map((item) => {
      if (item.id) return item
      changed = true
      return { ...item, id: generateId() }
    })
    if (changed) {
      user[key] = { ...section, list }
    }
  }

  return changed ? { ...data, user } : data
}

export function useResume(initial: ResumeData) {
  const [data, setData] = useState<ResumeData>(() => {
    return ensureIds(loadFromStorage() ?? initial)
  })

  const dataRef = useRef(data)
  dataRef.current = data
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave(data)
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
    try {
      const parsed = JSON.parse(json) as ResumeData
      if (!parsed.user || !parsed.title) {
        throw new Error('Invalid resume format')
      }
      setData(ensureIds(parsed))
    } catch (e) {
      throw new Error(
        `Import failed: ${e instanceof Error ? e.message : 'Invalid JSON'}`,
      )
    }
  }, [])

  const resetToInitial = useCallback(() => {
    setData(ensureIds(initial))
  }, [initial])

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
  }
}
