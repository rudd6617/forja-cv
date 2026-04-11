import type { ResumeData } from '../types/resume'
import type { AnalysisResult, AnalyzeRequest } from '../types/analysis'
import { stripHtml } from '../utils/html'

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

export async function analyzeJD(
  jd: string,
  data: ResumeData,
): Promise<AnalysisResult> {
  const request = buildRequest(jd, data)

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `API error: ${res.status}`,
    )
  }

  return (await res.json()) as AnalysisResult
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
                  suggested: `${request.resume.summary} 具備 ${missing.join('、')} 相關經驗。`,
                  reason: `加入 JD 中要求但履歷未提及的關鍵字：${missing.join(', ')}`,
                },
              ]
            : [],
        }),
      800,
    ),
  )
}
