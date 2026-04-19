import type {
  Application,
  ApplicationStatus,
  ApplicationSummary,
} from '../types/application'
import type { AnalysisResult } from '../types/analysis'
import { handleResponse, authHeaders, apiTimeoutSignal } from './resumeApi'

export interface CreateApplicationInput {
  resume_id: string
  company: string
  position: string
  jd?: string | null
  jd_url?: string | null
  status?: ApplicationStatus
  score?: number | null
  analysis?: AnalysisResult | null
  notes?: string | null
  applied_at?: string | null
  resume_snapshot?: string | null
}

export type UpdateApplicationInput = Partial<
  Pick<
    Application,
    'company' | 'position' | 'jd' | 'jd_url' | 'status' | 'score' | 'notes' | 'applied_at'
  >
>

export async function getApplication(
  idToken: string,
  id: string,
): Promise<Application> {
  const res = await fetch(`/api/applications/${id}`, {
    headers: authHeaders(idToken),
    signal: apiTimeoutSignal(),
  })
  return handleResponse<Application>(res)
}

export async function listApplications(
  idToken: string,
  status?: ApplicationStatus,
): Promise<ApplicationSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`/api/applications${qs}`, {
    headers: authHeaders(idToken),
    signal: apiTimeoutSignal(),
  })
  return handleResponse<ApplicationSummary[]>(res)
}

export async function createApplication(
  idToken: string,
  input: CreateApplicationInput,
): Promise<{ id: string }> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
    signal: apiTimeoutSignal(),
  })
  return handleResponse<{ id: string }>(res)
}

export async function updateApplication(
  idToken: string,
  id: string,
  update: UpdateApplicationInput,
): Promise<void> {
  const res = await fetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify(update),
    signal: apiTimeoutSignal(),
  })
  await handleResponse(res)
}

export async function deleteApplication(idToken: string, id: string): Promise<void> {
  const res = await fetch(`/api/applications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(idToken),
    signal: apiTimeoutSignal(),
  })
  await handleResponse(res)
}
