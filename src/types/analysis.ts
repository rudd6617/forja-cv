export interface Suggestion {
  section: 'summary' | 'experience'
  index?: number
  field: string
  original: string
  suggested: string
  reason: string
}

export interface AnalysisResult {
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: Suggestion[]
}

export interface AnalyzeRequest {
  jd: string
  resume: {
    summary: string
    experience: {
      title: string
      company: string
      period: string
      description: string
    }[]
  }
}
