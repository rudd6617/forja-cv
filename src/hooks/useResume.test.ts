import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResume } from './useResume'
import type { ResumeData } from '../types/resume'

const STORAGE_KEY = 'forja-cv-resume'

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    version: 1,
    title: 'Test Resume',
    user: {
      template: 1,
      splitIndex: 2,
      about: { isShow: true, isEditing: false, name: 'Alice', jobTitle: 'Dev' },
      summary: { isShow: true, isEditing: false, hashtags: [], paragraph: 'Summary text' },
      experience: { isShow: true, name: 'EXP', list: [], isEditing: false },
      project: { isShow: false, name: 'PROJECT', list: [], isEditing: false },
      skill: { isShow: false, name: 'SKILL', list: [], isEditing: false },
      education: { isShow: true, name: 'EDU', list: [], isEditing: false },
      certificate: { isShow: false, name: 'CERT', list: [], isEditing: false },
      contact: { isShow: true, name: 'CONTACT', list: [], isEditing: false },
      social: { isShow: true, name: 'SOCIAL', list: [], isEditing: false },
    },
    ...overrides,
  }
}

describe('useResume', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('uses initial data when localStorage is empty', () => {
      const initial = makeResume()
      const { result } = renderHook(() => useResume(initial))
      expect(result.current.data.title).toBe('Test Resume')
    })

    it('loads from localStorage if valid', () => {
      const saved = makeResume({ title: 'Saved Resume' })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

      const { result } = renderHook(() => useResume(makeResume()))
      expect(result.current.data.title).toBe('Saved Resume')
    })

    it('falls back to initial if localStorage has invalid data', () => {
      localStorage.setItem(STORAGE_KEY, '{"bad": true}')

      const { result } = renderHook(() => useResume(makeResume()))
      expect(result.current.data.title).toBe('Test Resume')
    })

    it('falls back to initial if localStorage has invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not json')

      const { result } = renderHook(() => useResume(makeResume()))
      expect(result.current.data.title).toBe('Test Resume')
    })

    it('migrates legacy data without version field', () => {
      const legacy = makeResume({ title: 'Legacy' })
      const raw = JSON.parse(JSON.stringify(legacy))
      delete raw.version
      raw.toolbar = { currentState: {}, noteList: [] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))

      const { result } = renderHook(() => useResume(makeResume()))
      expect(result.current.data.title).toBe('Legacy')
      expect(result.current.data.version).toBe(1)
      expect(result.current.data.toolbar).toBeUndefined()
    })
  })

  describe('updateAbout', () => {
    it('updates name', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.updateAbout('name', 'Bob'))
      expect(result.current.data.user.about.name).toBe('Bob')
    })

    it('updates jobTitle', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.updateAbout('jobTitle', 'Engineer'))
      expect(result.current.data.user.about.jobTitle).toBe('Engineer')
    })
  })

  describe('updateSummary', () => {
    it('updates paragraph', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.updateSummary('paragraph', 'New summary'))
      expect(result.current.data.user.summary.paragraph).toBe('New summary')
    })

    it('updates hashtags', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.updateSummary('hashtags', ['a', 'b']))
      expect(result.current.data.user.summary.hashtags).toEqual(['a', 'b'])
    })
  })

  describe('section items', () => {
    it('addSectionItem appends item with generated id', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.addSectionItem('experience'))
      const list = result.current.data.user.experience.list
      expect(list).toHaveLength(1)
      expect(list[0].id).toMatch(/^item-/)
      expect(list[0].isShow).toBe(true)
    })

    it('removeSectionItem removes by index', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => {
        result.current.addSectionItem('experience')
        result.current.addSectionItem('experience')
      })
      expect(result.current.data.user.experience.list).toHaveLength(2)

      act(() => result.current.removeSectionItem('experience', 0))
      expect(result.current.data.user.experience.list).toHaveLength(1)
    })

    it('updateSectionItem merges partial update', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.addSectionItem('experience'))
      act(() => result.current.updateSectionItem('experience', 0, { title: 'Dev Lead' }))

      expect(result.current.data.user.experience.list[0].title).toBe('Dev Lead')
      expect(result.current.data.user.experience.list[0].isShow).toBe(true)
    })

    it('moveSectionItem reorders correctly', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => {
        result.current.addSectionItem('experience')
        result.current.addSectionItem('experience')
        result.current.addSectionItem('experience')
      })

      const ids = result.current.data.user.experience.list.map((i) => i.id)

      act(() => result.current.moveSectionItem('experience', 0, 2))

      const newIds = result.current.data.user.experience.list.map((i) => i.id)
      expect(newIds).toEqual([ids[1], ids[2], ids[0]])
    })
  })

  describe('import / export', () => {
    it('exportData returns JSON of current state', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      const json = result.current.exportData()
      const parsed = JSON.parse(json)
      expect(parsed.title).toBe('Test Resume')
    })

    it('importData with valid JSON updates state', () => {
      const { result } = renderHook(() => useResume(makeResume()))
      const importResume = makeResume({ title: 'Imported' })

      act(() => result.current.importData(JSON.stringify(importResume)))
      expect(result.current.data.title).toBe('Imported')
    })

    it('importData with invalid JSON throws', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      expect(() => result.current.importData('not json')).toThrow('Invalid JSON')
    })

    it('importData with invalid structure throws', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      expect(() => result.current.importData('{"title":"x"}')).toThrow('Invalid resume format')
    })
  })

  describe('resetToInitial', () => {
    it('resets to initial data', () => {
      const initial = makeResume({ title: 'Original' })
      const { result } = renderHook(() => useResume(initial))

      act(() => result.current.updateAbout('name', 'Changed'))
      act(() => result.current.resetToInitial())

      expect(result.current.data.user.about.name).toBe('Alice')
      expect(result.current.data.title).toBe('Original')
    })
  })

  describe('loadData', () => {
    it('replaces entire state', () => {
      const { result } = renderHook(() => useResume(makeResume()))
      const newData = makeResume({ title: 'Loaded' })

      act(() => result.current.loadData(newData))
      expect(result.current.data.title).toBe('Loaded')
    })
  })

  describe('debounced save', () => {
    it('saves to localStorage after debounce', () => {
      const { result } = renderHook(() => useResume(makeResume()))

      act(() => result.current.updateAbout('name', 'Debounced'))
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

      act(() => { vi.advanceTimersByTime(600) })
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved.user.about.name).toBe('Debounced')
    })
  })

  describe('onDataChange callback', () => {
    it('fires on mutations but not on first render', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => useResume(makeResume(), onChange))

      expect(onChange).not.toHaveBeenCalled()

      act(() => result.current.updateAbout('name', 'New'))
      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange.mock.calls[0][0].user.about.name).toBe('New')
    })
  })
})
