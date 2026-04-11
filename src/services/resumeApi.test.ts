import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  setOnUnauthorized,
} from './resumeApi'

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('resumeApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setOnUnauthorized(null)
  })

  describe('listResumes', () => {
    it('sends GET with auth header', async () => {
      const spy = mockFetch([{ id: '1', title: 'Test', updated_at: '2024-01-01' }])
      const result = await listResumes('token-abc')

      expect(spy).toHaveBeenCalledOnce()
      const [url, init] = spy.mock.calls[0]
      expect(url).toBe('/api/resumes')
      expect(init?.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-abc',
      })
      expect(result).toEqual([{ id: '1', title: 'Test', updated_at: '2024-01-01' }])
    })
  })

  describe('getResume', () => {
    it('sends GET to correct URL', async () => {
      const spy = mockFetch({ id: 'r1', title: 'My CV', data: '{}', updated_at: '2024-01-01' })
      await getResume('tok', 'r1')

      expect(spy.mock.calls[0][0]).toBe('/api/resumes/r1')
    })
  })

  describe('createResume', () => {
    it('sends POST with title and data', async () => {
      const spy = mockFetch({ id: 'new-id' }, 201)
      const result = await createResume('tok', 'My Resume', '{"title":"x"}')

      const [, init] = spy.mock.calls[0]
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual({
        title: 'My Resume',
        data: '{"title":"x"}',
      })
      expect(result).toEqual({ id: 'new-id' })
    })
  })

  describe('updateResume', () => {
    it('sends PUT with partial update', async () => {
      const spy = mockFetch({ ok: true })
      await updateResume('tok', 'r1', { title: 'Updated' })

      const [url, init] = spy.mock.calls[0]
      expect(url).toBe('/api/resumes/r1')
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(init?.body as string)).toEqual({ title: 'Updated' })
    })
  })

  describe('deleteResume', () => {
    it('sends DELETE to correct URL', async () => {
      const spy = mockFetch({ ok: true })
      await deleteResume('tok', 'r1')

      const [url, init] = spy.mock.calls[0]
      expect(url).toBe('/api/resumes/r1')
      expect(init?.method).toBe('DELETE')
    })
  })

  describe('error handling', () => {
    it('throws with error message from response body', async () => {
      mockFetch({ error: 'Not found' }, 404)
      await expect(listResumes('tok')).rejects.toThrow('Not found')
    })

    it('throws with status when body has no error field', async () => {
      mockFetch({}, 500)
      await expect(listResumes('tok')).rejects.toThrow('API error: 500')
    })

    it('calls onUnauthorized on 401', async () => {
      mockFetch({ error: 'Invalid token' }, 401)
      const handler = vi.fn()
      setOnUnauthorized(handler)

      await expect(listResumes('tok')).rejects.toThrow('Invalid token')
      expect(handler).toHaveBeenCalledOnce()
    })

    it('does not call onUnauthorized on other errors', async () => {
      mockFetch({ error: 'Server error' }, 500)
      const handler = vi.fn()
      setOnUnauthorized(handler)

      await expect(listResumes('tok')).rejects.toThrow()
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('timeout', () => {
    it('passes an AbortSignal to fetch', async () => {
      const spy = mockFetch([])
      await listResumes('tok')

      const [, init] = spy.mock.calls[0]
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    })
  })
})
