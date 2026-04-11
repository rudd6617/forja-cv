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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function listResumes(idToken: string): Promise<ResumeSummary[]> {
  const res = await fetch('/api/resumes', { headers: headers(idToken) })
  return handleResponse<ResumeSummary[]>(res)
}

export async function getResume(idToken: string, id: string): Promise<ResumeRecord> {
  const res = await fetch(`/api/resumes/${id}`, { headers: headers(idToken) })
  return handleResponse<ResumeRecord>(res)
}

export async function createResume(idToken: string, title: string, data: string): Promise<{ id: string }> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: headers(idToken),
    body: JSON.stringify({ title, data }),
  })
  return handleResponse<{ id: string }>(res)
}

export async function updateResume(idToken: string, id: string, update: { title?: string; data?: string }): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: headers(idToken),
    body: JSON.stringify(update),
  })
  await handleResponse(res)
}

export async function deleteResume(idToken: string, id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'DELETE',
    headers: headers(idToken),
  })
  await handleResponse(res)
}
