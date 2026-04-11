interface Env {
  VLLM_API_URL: string
  VLLM_MODEL: string
}

const MAX_JD_LENGTH = 10_000
const MAX_RESUME_LENGTH = 20_000

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume optimization expert.
You will receive a job description (JD) and a candidate's resume.

Analyze the resume against the JD and return a JSON object with:
1. "score": ATS match score 0-100
2. "matchedKeywords": keywords/skills from the JD that ARE in the resume
3. "missingKeywords": keywords/skills from the JD that are NOT in the resume
4. "suggestions": array of specific rewrite suggestions

Each suggestion must have:
- "section": "summary" or "experience"
- "index": (for experience only) the 0-based index of the experience entry
- "field": the field to modify ("paragraph" for summary, "paragraph" for experience description)
- "original": the original text (plain text, not HTML)
- "suggested": the improved text (plain text, not HTML). Incorporate missing keywords naturally.
- "reason": brief explanation of why this change improves ATS match

Rules:
- Keep the candidate's original language (Traditional Chinese or English as-is)
- Do NOT fabricate experience. Only rephrase existing content to better match JD keywords.
- Focus on measurable impact and action verbs.
- Return ONLY valid JSON, no markdown fences, no extra text.`

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

interface ExperienceEntry {
  title: string
  company: string
  period: string
  description: string
}

interface RequestBody {
  jd: string
  resume: {
    summary: string
    experience: ExperienceEntry[]
  }
}

function validateBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.jd !== 'string') return false
  if (!b.resume || typeof b.resume !== 'object') return false
  const resume = b.resume as Record<string, unknown>
  if (typeof resume.summary !== 'string') return false
  if (!Array.isArray(resume.experience)) return false
  return true
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>?/g, '')
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const { VLLM_API_URL, VLLM_MODEL } = env

  if (!VLLM_API_URL || !validateUrl(VLLM_API_URL)) {
    return Response.json(
      { error: 'VLLM_API_URL not configured or invalid' },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!validateBody(body)) {
    return Response.json(
      { error: 'Invalid request: requires jd (string), resume.summary (string), resume.experience (array)' },
      { status: 400 },
    )
  }

  if (body.jd.length > MAX_JD_LENGTH) {
    return Response.json(
      { error: `JD exceeds maximum length of ${MAX_JD_LENGTH} characters` },
      { status: 400 },
    )
  }

  const resumeJson = JSON.stringify(body.resume)
  if (resumeJson.length > MAX_RESUME_LENGTH) {
    return Response.json(
      { error: `Resume exceeds maximum length of ${MAX_RESUME_LENGTH} characters` },
      { status: 400 },
    )
  }

  const userMessage = `## Job Description\n${body.jd}\n\n## Resume\n### Summary\n${body.resume.summary}\n\n### Experience\n${body.resume.experience
    .map(
      (e, i) =>
        `#### [${i}] ${e.title} @ ${e.company} (${e.period})\n${e.description}`,
    )
    .join('\n\n')}`

  const response = await fetch(`${VLLM_API_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VLLM_MODEL || 'default',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    return Response.json(
      { error: `Upstream service error (${response.status})` },
      { status: 502 },
    )
  }

  const result = await response.json() as {
    choices: { message: { content: string } }[]
  }
  const content = result.choices[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(content)

    if (Array.isArray(parsed.suggestions)) {
      parsed.suggestions = parsed.suggestions.map(
        (s: Record<string, unknown>) => ({
          ...s,
          original: typeof s.original === 'string' ? stripHtmlTags(s.original) : '',
          suggested: typeof s.suggested === 'string' ? stripHtmlTags(s.suggested) : '',
          reason: typeof s.reason === 'string' ? stripHtmlTags(s.reason) : '',
        }),
      )
    }

    return Response.json(parsed)
  } catch {
    return Response.json(
      { error: 'Failed to parse analysis response' },
      { status: 502 },
    )
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/analyze') {
      return handleAnalyze(request, env)
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
