interface Env {
  VLLM_API_URL: string
  VLLM_MODEL: string
}

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { VLLM_API_URL, VLLM_MODEL } = context.env

  if (!VLLM_API_URL) {
    return Response.json(
      { error: 'VLLM_API_URL not configured' },
      { status: 500 },
    )
  }

  const body = await context.request.json()

  const userMessage = `## Job Description\n${body.jd}\n\n## Resume\n### Summary\n${body.resume.summary}\n\n### Experience\n${body.resume.experience
    .map(
      (e: { title: string; company: string; period: string; description: string }, i: number) =>
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
    const text = await response.text()
    return Response.json(
      { error: `vLLM error: ${response.status}`, detail: text },
      { status: 502 },
    )
  }

  const result = await response.json() as {
    choices: { message: { content: string } }[]
  }
  const content = result.choices[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(content)
    return Response.json(parsed)
  } catch {
    return Response.json(
      { error: 'Failed to parse LLM response', raw: content },
      { status: 502 },
    )
  }
}
