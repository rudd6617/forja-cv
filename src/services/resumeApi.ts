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

function headers(idToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  }
}

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

const TIMEOUT_MS = 15_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS)
}

export async function listResumes(idToken: string): Promise<ResumeSummary[]> {
  const res = await fetch('/api/resumes', { headers: headers(idToken), signal: timeoutSignal() })
  return handleResponse<ResumeSummary[]>(res)
}

export async function getResume(idToken: string, id: string): Promise<ResumeRecord> {
  const res = await fetch(`/api/resumes/${id}`, { headers: headers(idToken), signal: timeoutSignal() })
  return handleResponse<ResumeRecord>(res)
}

export async function createResume(idToken: string, title: string, data: string): Promise<{ id: string }> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: headers(idToken),
    body: JSON.stringify({ title, data }),
    signal: timeoutSignal(),
  })
  return handleResponse<{ id: string }>(res)
}

export async function updateResume(idToken: string, id: string, update: { title?: string; data?: string }): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: headers(idToken),
    body: JSON.stringify(update),
    signal: timeoutSignal(),
  })
  await handleResponse(res)
}

export async function deleteResume(idToken: string, id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'DELETE',
    headers: headers(idToken),
    signal: timeoutSignal(),
  })
  await handleResponse(res)
}
