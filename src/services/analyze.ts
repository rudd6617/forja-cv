import type { ResumeData } from '../types/resume'
import type { AnalysisResult, AnalyzeRequest } from '../types/analysis'
import { stripHtml } from '../utils/html'
import { handleResponse } from './resumeApi'

function buildRequest(jd: string, data: ResumeData): AnalyzeRequest {
  return {
    jd,
    resume: {
      summary: stripHtml(data.user.summary.paragraph),
      experience: data.user.experience.list
        .filter((e) => e.isShow)
        .map((e) => ({
          title: stripHtml(e.title ?? ''),
          company: stripHtml(e.subtitle1 ?? ''),
          period: stripHtml(e.subtitle2 ?? ''),
          description: stripHtml(e.paragraph ?? ''),
        })),
    },
  }
}

const ANALYZE_TIMEOUT_MS = 65_000

export async function analyzeJD(
  idToken: string,
  jd: string,
  data: ResumeData,
): Promise<AnalysisResult> {
  const request = buildRequest(jd, data)

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
  })

  return handleResponse<AnalysisResult>(res)
}

export function mockAnalyzeJD(
  jd: string,
  data: ResumeData,
): Promise<AnalysisResult> {
  const request = buildRequest(jd, data)
  const jdLower = jd.toLowerCase()

  const techKeywords = [
    'python', 'django', 'fastapi', 'react', 'typescript', 'javascript',
    'docker', 'kubernetes', 'aws', 'gcp', 'ci/cd', 'postgresql', 'mysql',
    'redis', 'graphql', 'rest', 'api', 'microservices', 'agile', 'scrum',
    'node.js', 'vue', 'angular', 'terraform', 'linux', 'git',
    'php', 'laravel', 'websocket', 'mongodb', 'elasticsearch',
  ]

  const resumeText = [
    request.resume.summary,
    ...request.resume.experience.map((e) => e.description),
  ]
    .join(' ')
    .toLowerCase()

  const jdKeywords = techKeywords.filter((k) => jdLower.includes(k))
  const matched = jdKeywords.filter((k) => resumeText.includes(k))
  const missing = jdKeywords.filter((k) => !resumeText.includes(k))
  const score = jdKeywords.length > 0
    ? Math.round((matched.length / jdKeywords.length) * 100)
    : 50

  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          score,
          matchedKeywords: matched,
          missingKeywords: missing,
          suggestions: missing.length > 0
            ? [
                {
                  section: 'summary',
                  field: 'paragraph',
                  original: request.resume.summary,
                  suggested: `${request.resume.summary} Experienced with ${missing.join(', ')}.`,
                  reason: `Add missing JD keywords: ${missing.join(', ')}`,
                },
              ]
            : [],
        }),
      800,
    ),
  )
}
