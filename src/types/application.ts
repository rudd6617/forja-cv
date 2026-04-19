import type { AnalysisResult } from './analysis'

export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'draft',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]

export interface Application {
  id: string
  resume_id: string
  company: string
  position: string
  jd: string | null
  jd_url: string | null
  status: ApplicationStatus
  score: number | null
  analysis: AnalysisResult | null
  notes: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
  resume_snapshot: string | null
}

export interface ApplicationSummary {
  id: string
  resume_id: string
  company: string
  position: string
  status: ApplicationStatus
  score: number | null
  updated_at: string
}
