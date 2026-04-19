export interface ResumeSummary {
  id: string
  title: string
  updated_at: string
}

interface ResumeRecord {
  id: string
  title: string
  data: string
  updated_at: string
}

export function authHeaders(idToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  }
}

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    if (res.status === 409) {
      const err = await res.json().catch(() => ({}))
      throw new ConflictError((err as { error?: string }).error ?? 'Conflict')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

const TIMEOUT_MS = 15_000

export function apiTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS)
}

export async function listResumes(idToken: string): Promise<ResumeSummary[]> {
  const res = await fetch('/api/resumes', { headers: authHeaders(idToken), signal: apiTimeoutSignal() })
  return handleResponse<ResumeSummary[]>(res)
}

export async function getResume(idToken: string, id: string): Promise<ResumeRecord> {
  const res = await fetch(`/api/resumes/${id}`, { headers: authHeaders(idToken), signal: apiTimeoutSignal() })
  return handleResponse<ResumeRecord>(res)
}

export async function createResume(idToken: string, title: string, data: string): Promise<{ id: string }> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ title, data }),
    signal: apiTimeoutSignal(),
  })
  return handleResponse<{ id: string }>(res)
}

export async function updateResume(
  idToken: string,
  id: string,
  update: { title?: string; data?: string; updated_at?: string },
): Promise<{ updated_at: string }> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: authHeaders(idToken),
    body: JSON.stringify(update),
    signal: apiTimeoutSignal(),
  })
  return handleResponse<{ updated_at: string }>(res)
}

export async function deleteResume(idToken: string, id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(idToken),
    signal: apiTimeoutSignal(),
  })
  await handleResponse(res)
}
