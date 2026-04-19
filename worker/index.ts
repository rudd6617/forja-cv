interface Env {
  LLM_API_URL: string
  LLM_MODEL: string
  DB: D1Database
  GOOGLE_CLIENT_ID: string
}

// ─── Google JWT Verification ───

interface GoogleUser {
  googleId: string
  email: string
  name: string
  picture: string
}

let cachedJwks: { keys: JsonWebKey[]; fetchedAt: number } | null = null

async function fetchGoogleJwks(): Promise<JsonWebKey[]> {
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < 3600_000) {
    return cachedJwks.keys
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  const data = (await res.json()) as { keys: JsonWebKey[] }
  cachedJwks = { keys: data.keys, fetchedAt: Date.now() }
  return data.keys
}

async function verifyGoogleIdToken(
  token: string,
  clientId: string,
): Promise<GoogleUser | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

  if (header.alg !== 'RS256') return null
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') return null
  if (payload.aud !== clientId) return null
  if (payload.exp * 1000 < Date.now()) return null

  const jwks = await fetchGoogleJwks()
  const jwk = jwks.find((k) => (k as { kid?: string }).kid === header.kid)
  if (!jwk) return null

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
  if (!valid) return null

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  }
}

async function authenticate(request: Request, env: Env): Promise<GoogleUser | Response> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.slice(7)
  if (!env.GOOGLE_CLIENT_ID) {
    return Response.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 })
  }
  const clientId = env.GOOGLE_CLIENT_ID
  const user = await verifyGoogleIdToken(token, clientId)
  if (!user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }
  return user
}

// ─── Resume CRUD ───

async function ensureUser(db: D1Database, user: GoogleUser) {
  await db
    .prepare('INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?) ON CONFLICT(google_id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture')
    .bind(user.googleId, user.email, user.name, user.picture)
    .run()
}

async function handleListResumes(user: GoogleUser, env: Env): Promise<Response> {
  const { results } = await env.DB
    .prepare('SELECT id, title, updated_at FROM resumes WHERE google_id = ? ORDER BY updated_at DESC')
    .bind(user.googleId)
    .all()
  return Response.json(results)
}

const MAX_TITLE_LENGTH = 200
const MAX_DATA_LENGTH = 1_000_000
const MAX_RESUMES_PER_USER = 50

async function handleCreateResume(request: Request, user: GoogleUser, env: Env): Promise<Response> {
  let body: { title: string; data: string }
  try {
    body = (await request.json()) as { title: string; data: string }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body.title !== 'string' || typeof body.data !== 'string' || !body.title || !body.data) {
    return Response.json({ error: 'title and data are required (string)' }, { status: 400 })
  }
  if (body.title.length > MAX_TITLE_LENGTH) {
    return Response.json({ error: 'Title too long' }, { status: 400 })
  }
  if (body.data.length > MAX_DATA_LENGTH) {
    return Response.json({ error: 'Data too large' }, { status: 400 })
  }
  const count = await env.DB
    .prepare('SELECT COUNT(*) as c FROM resumes WHERE google_id = ?')
    .bind(user.googleId)
    .first<{ c: number }>()
  if (count && count.c >= MAX_RESUMES_PER_USER) {
    return Response.json({ error: `Maximum ${MAX_RESUMES_PER_USER} resumes reached` }, { status: 400 })
  }
  const id = crypto.randomUUID()
  await env.DB
    .prepare('INSERT INTO resumes (id, google_id, title, data) VALUES (?, ?, ?, ?)')
    .bind(id, user.googleId, body.title, body.data)
    .run()
  return Response.json({ id }, { status: 201 })
}

async function handleGetResume(id: string, user: GoogleUser, env: Env): Promise<Response> {
  const row = await env.DB
    .prepare('SELECT id, title, data, updated_at FROM resumes WHERE id = ? AND google_id = ?')
    .bind(id, user.googleId)
    .first()
  if (!row) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json(row)
}

async function handleUpdateResume(id: string, request: Request, user: GoogleUser, env: Env): Promise<Response> {
  let body: { title?: string; data?: string; updated_at?: string }
  try {
    body = (await request.json()) as { title?: string; data?: string; updated_at?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.length > MAX_TITLE_LENGTH)) {
    return Response.json({ error: 'Invalid title' }, { status: 400 })
  }
  if (body.data !== undefined && (typeof body.data !== 'string' || body.data.length > MAX_DATA_LENGTH)) {
    return Response.json({ error: 'Data too large' }, { status: 400 })
  }
  const sets: string[] = []
  const binds: string[] = []
  if (body.title !== undefined) { sets.push('title = ?'); binds.push(body.title) }
  if (body.data !== undefined) { sets.push('data = ?'); binds.push(body.data) }
  if (sets.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }
  sets.push("updated_at = datetime('now')")
  const whereClauses = ['id = ?', 'google_id = ?']
  const whereBinds: string[] = [id, user.googleId]
  if (body.updated_at) {
    whereClauses.push('updated_at = ?')
    whereBinds.push(body.updated_at)
  }
  const result = await env.DB
    .prepare(`UPDATE resumes SET ${sets.join(', ')} WHERE ${whereClauses.join(' AND ')}`)
    .bind(...binds, ...whereBinds)
    .run()
  if (!result.meta.changes) {
    const exists = await env.DB
      .prepare('SELECT id FROM resumes WHERE id = ? AND google_id = ?')
      .bind(id, user.googleId)
      .first()
    if (!exists) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ error: 'Conflict: resume was modified by another request' }, { status: 409 })
  }
  const row = await env.DB
    .prepare('SELECT updated_at FROM resumes WHERE id = ?')
    .bind(id)
    .first<{ updated_at: string }>()
  return Response.json({ ok: true, updated_at: row!.updated_at })
}

async function handleDeleteResume(id: string, user: GoogleUser, env: Env): Promise<Response> {
  const existing = await env.DB
    .prepare('SELECT id FROM resumes WHERE id = ? AND google_id = ?')
    .bind(id, user.googleId)
    .first()
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM applications WHERE resume_id = ? AND google_id = ?').bind(id, user.googleId),
    env.DB.prepare('DELETE FROM resumes WHERE id = ? AND google_id = ?').bind(id, user.googleId),
  ])
  return Response.json({ ok: true })
}

async function handleResumes(request: Request, env: Env): Promise<Response> {
  const result = await authenticate(request, env)
  if (result instanceof Response) return result
  const user = result
  await ensureUser(env.DB, user)

  const url = new URL(request.url)
  const idMatch = url.pathname.match(/^\/api\/resumes\/([a-f0-9-]+)$/)

  if (idMatch) {
    const id = idMatch[1]
    if (request.method === 'GET') return handleGetResume(id, user, env)
    if (request.method === 'PUT') return handleUpdateResume(id, request, user, env)
    if (request.method === 'DELETE') return handleDeleteResume(id, user, env)
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  if (url.pathname === '/api/resumes') {
    if (request.method === 'GET') return handleListResumes(user, env)
    if (request.method === 'POST') return handleCreateResume(request, user, env)
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

// ─── Applications CRUD ───

const MAX_APPLICATION_FIELD_LENGTH = 500
const MAX_NOTES_LENGTH = 5_000
const MAX_ANALYSIS_LENGTH = 100_000
const MAX_SNAPSHOT_LENGTH = 1_000_000
const MAX_APPLICATIONS_PER_USER = 500
const APPLICATION_STATUSES = [
  'draft', 'applied', 'interview', 'offer', 'rejected', 'withdrawn',
] as const
type AppStatus = typeof APPLICATION_STATUSES[number]
function isStatus(v: unknown): v is AppStatus {
  return typeof v === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(v)
}

async function handleListApplications(user: GoogleUser, env: Env, url: URL): Promise<Response> {
  const status = url.searchParams.get('status')
  if (status !== null && !isStatus(status)) {
    return Response.json({ error: 'Invalid status filter' }, { status: 400 })
  }
  const query = status
    ? 'SELECT id, resume_id, company, position, status, score, updated_at FROM applications WHERE google_id = ? AND status = ? ORDER BY updated_at DESC'
    : 'SELECT id, resume_id, company, position, status, score, updated_at FROM applications WHERE google_id = ? ORDER BY updated_at DESC'
  const binds = status ? [user.googleId, status] : [user.googleId]
  const { results } = await env.DB.prepare(query).bind(...binds).all()
  return Response.json(results)
}

interface CreateAppBody {
  resume_id: string
  company: string
  position: string
  jd?: string | null
  jd_url?: string | null
  status?: AppStatus
  score?: number | null
  analysis?: unknown
  notes?: string | null
  applied_at?: string | null
  resume_snapshot?: string | null
}

function validateStringField(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}

async function handleCreateApplication(request: Request, user: GoogleUser, env: Env): Promise<Response> {
  let body: CreateAppBody
  try {
    body = (await request.json()) as CreateAppBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!validateStringField(body.resume_id, 100)) {
    return Response.json({ error: 'resume_id is required' }, { status: 400 })
  }
  if (!validateStringField(body.company, MAX_APPLICATION_FIELD_LENGTH)) {
    return Response.json({ error: 'company is required' }, { status: 400 })
  }
  if (!validateStringField(body.position, MAX_APPLICATION_FIELD_LENGTH)) {
    return Response.json({ error: 'position is required' }, { status: 400 })
  }
  if (body.status !== undefined && !isStatus(body.status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (body.notes !== undefined && body.notes !== null && (typeof body.notes !== 'string' || body.notes.length > MAX_NOTES_LENGTH)) {
    return Response.json({ error: 'Invalid notes' }, { status: 400 })
  }

  const analysisJson = body.analysis ? JSON.stringify(body.analysis) : null
  if (analysisJson && analysisJson.length > MAX_ANALYSIS_LENGTH) {
    return Response.json({ error: 'Analysis too large' }, { status: 400 })
  }

  if (body.resume_snapshot !== undefined && body.resume_snapshot !== null) {
    if (typeof body.resume_snapshot !== 'string') {
      return Response.json({ error: 'resume_snapshot must be a string' }, { status: 400 })
    }
    if (body.resume_snapshot.length > MAX_SNAPSHOT_LENGTH) {
      return Response.json({ error: 'resume_snapshot too large' }, { status: 400 })
    }
  }

  const resumeOwned = await env.DB
    .prepare('SELECT id FROM resumes WHERE id = ? AND google_id = ?')
    .bind(body.resume_id, user.googleId)
    .first()
  if (!resumeOwned) {
    return Response.json({ error: 'Resume not found' }, { status: 400 })
  }

  const count = await env.DB
    .prepare('SELECT COUNT(*) as c FROM applications WHERE google_id = ?')
    .bind(user.googleId)
    .first<{ c: number }>()
  if (count && count.c >= MAX_APPLICATIONS_PER_USER) {
    return Response.json({ error: `Maximum ${MAX_APPLICATIONS_PER_USER} applications reached` }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await env.DB
    .prepare(`INSERT INTO applications
      (id, google_id, resume_id, company, position, jd, jd_url, status, score, analysis, notes, applied_at, resume_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      user.googleId,
      body.resume_id,
      body.company,
      body.position,
      body.jd ?? null,
      body.jd_url ?? null,
      body.status ?? 'draft',
      body.score ?? null,
      analysisJson,
      body.notes ?? null,
      body.applied_at ?? null,
      body.resume_snapshot ?? null,
    )
    .run()
  return Response.json({ id }, { status: 201 })
}

async function handleGetApplication(id: string, user: GoogleUser, env: Env): Promise<Response> {
  const row = await env.DB
    .prepare(`SELECT id, resume_id, company, position, jd, jd_url, status, score,
      analysis, notes, applied_at, created_at, updated_at, resume_snapshot
      FROM applications WHERE id = ? AND google_id = ?`)
    .bind(id, user.googleId)
    .first<Record<string, unknown>>()
  if (!row) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const analysis = row.analysis ? JSON.parse(row.analysis as string) : null
  return Response.json({ ...row, analysis })
}

interface UpdateAppBody {
  company?: string
  position?: string
  jd?: string | null
  jd_url?: string | null
  status?: AppStatus
  score?: number | null
  notes?: string | null
  applied_at?: string | null
}

async function handleUpdateApplication(id: string, request: Request, user: GoogleUser, env: Env): Promise<Response> {
  let body: UpdateAppBody
  try {
    body = (await request.json()) as UpdateAppBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const sets: string[] = []
  const binds: (string | number | null)[] = []

  if (body.company !== undefined) {
    if (!validateStringField(body.company, MAX_APPLICATION_FIELD_LENGTH)) {
      return Response.json({ error: 'Invalid company' }, { status: 400 })
    }
    sets.push('company = ?'); binds.push(body.company)
  }
  if (body.position !== undefined) {
    if (!validateStringField(body.position, MAX_APPLICATION_FIELD_LENGTH)) {
      return Response.json({ error: 'Invalid position' }, { status: 400 })
    }
    sets.push('position = ?'); binds.push(body.position)
  }
  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }
    sets.push('status = ?'); binds.push(body.status)
  }
  if (body.jd !== undefined) { sets.push('jd = ?'); binds.push(body.jd) }
  if (body.jd_url !== undefined) { sets.push('jd_url = ?'); binds.push(body.jd_url) }
  if (body.score !== undefined) { sets.push('score = ?'); binds.push(body.score) }
  if (body.notes !== undefined) {
    if (body.notes !== null && (typeof body.notes !== 'string' || body.notes.length > MAX_NOTES_LENGTH)) {
      return Response.json({ error: 'Invalid notes' }, { status: 400 })
    }
    sets.push('notes = ?'); binds.push(body.notes)
  }
  if (body.applied_at !== undefined) { sets.push('applied_at = ?'); binds.push(body.applied_at) }

  if (sets.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }
  sets.push("updated_at = datetime('now')")

  const result = await env.DB
    .prepare(`UPDATE applications SET ${sets.join(', ')} WHERE id = ? AND google_id = ?`)
    .bind(...binds, id, user.googleId)
    .run()
  if (!result.meta.changes) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ ok: true })
}

async function handleDeleteApplication(id: string, user: GoogleUser, env: Env): Promise<Response> {
  const result = await env.DB
    .prepare('DELETE FROM applications WHERE id = ? AND google_id = ?')
    .bind(id, user.googleId)
    .run()
  if (!result.meta.changes) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ ok: true })
}

async function handleApplications(request: Request, env: Env): Promise<Response> {
  const result = await authenticate(request, env)
  if (result instanceof Response) return result
  const user = result
  await ensureUser(env.DB, user)

  const url = new URL(request.url)
  const idMatch = url.pathname.match(/^\/api\/applications\/([a-f0-9-]+)$/)

  if (idMatch) {
    const id = idMatch[1]
    if (request.method === 'GET') return handleGetApplication(id, user, env)
    if (request.method === 'PATCH') return handleUpdateApplication(id, request, user, env)
    if (request.method === 'DELETE') return handleDeleteApplication(id, user, env)
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  if (url.pathname === '/api/applications') {
    if (request.method === 'GET') return handleListApplications(user, env, url)
    if (request.method === 'POST') return handleCreateApplication(request, user, env)
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

// ─── JD Analysis (existing) ───

const MAX_JD_LENGTH = 10_000
const MAX_RESUME_LENGTH = 20_000

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume optimization expert.
You will receive a job description (JD) and a candidate's resume.

Analyze the resume against the JD and return a JSON object with:
1. "score": overall ATS match score 0-100
2. "scoreBreakdown": object with three sub-scores (each 0-100):
   - "skillMatch": how well the candidate's skills match JD requirements
   - "experienceRelevance": how relevant the work experience is to the role
   - "keywordCoverage": percentage of JD keywords found in the resume
3. "matchedKeywords": keywords/skills from the JD that ARE in the resume
4. "missingKeywords": keywords/skills from the JD that are NOT in the resume
5. "suggestions": array of specific rewrite suggestions

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
- Return ONLY the JSON object. No thinking, no explanation, no markdown fences, no extra text.`

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

interface AnalyzeRequestBody {
  jd: string
  resume: {
    summary: string
    experience: ExperienceEntry[]
  }
}

function validateAnalyzeBody(body: unknown): body is AnalyzeRequestBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.jd !== 'string') return false
  if (!b.resume || typeof b.resume !== 'object') return false
  const resume = b.resume as Record<string, unknown>
  if (typeof resume.summary !== 'string') return false
  if (!Array.isArray(resume.experience)) return false
  return true
}

// Regex-based: DOMParser is unavailable in the Workers runtime
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>?/g, '')
}

// ─── Rate Limiting ───

const RATE_LIMIT_MAX = 3

async function checkRateLimit(userId: string, db: D1Database): Promise<boolean> {
  const [, countResult] = await db.batch([
    db.prepare("DELETE FROM rate_limits WHERE google_id = ? AND requested_at < datetime('now', '-60 seconds')").bind(userId),
    db.prepare("SELECT COUNT(*) as c FROM rate_limits WHERE google_id = ? AND requested_at >= datetime('now', '-60 seconds')").bind(userId),
  ])

  const row = countResult.results?.[0] as { c: number } | undefined
  if (row && row.c >= RATE_LIMIT_MAX) return false

  await db.prepare('INSERT INTO rate_limits (google_id) VALUES (?)').bind(userId).run()
  return true
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed
  const match = trimmed.match(/\{[\s\S]*\}/)
  return match ? match[0] : trimmed
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  console.log('[analyze] 1/7 received POST')
  const authResult = await authenticate(request, env)
  if (authResult instanceof Response) return authResult
  console.log('[analyze] 2/7 authenticated user=', authResult.googleId)

  if (!(await checkRateLimit(authResult.googleId, env.DB))) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 },
    )
  }

  const { LLM_API_URL, LLM_MODEL } = env

  if (!LLM_API_URL || !validateUrl(LLM_API_URL)) {
    return Response.json(
      { error: 'LLM_API_URL not configured or invalid' },
      { status: 500 },
    )
  }

  if (!LLM_MODEL) {
    return Response.json(
      { error: 'LLM_MODEL not configured' },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!validateAnalyzeBody(body)) {
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

  console.log('[analyze] 3/7 calling LLM', LLM_API_URL, 'model=', LLM_MODEL, 'jd.len=', body.jd.length, 'resume.len=', resumeJson.length)
  const startedAt = Date.now()
  const response = await fetch(`${LLM_API_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    }),
  })

  console.log('[analyze] 4/7 LLM responded status=', response.status, 'in', Date.now() - startedAt, 'ms')

  if (!response.ok) {
    return Response.json(
      { error: `Upstream service error (${response.status})` },
      { status: 502 },
    )
  }

  const result = await response.json() as {
    choices: { message: { content: string } }[]
    usage?: { completion_tokens?: number }
  }
  const rawContent = result.choices[0]?.message?.content ?? ''
  console.log('[analyze] 5/7 extracted content, len=', rawContent.length,
    'completion_tokens=', result.usage?.completion_tokens,
    'preview=', rawContent.slice(0, 120))

  try {
    const parsed = JSON.parse(extractJson(rawContent))
    console.log('[analyze] 6/7 parsed JSON, keys=', Object.keys(parsed).join(','))

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

    console.log('[analyze] 7/7 returning parsed result')
    return Response.json(parsed)
  } catch (err) {
    console.error('[analyze] parse failure:', err)
    console.error('[analyze] full raw content:', rawContent)
    return Response.json(
      {
        error: 'Failed to parse analysis response',
        preview: rawContent.slice(0, 500),
      },
      { status: 502 },
    )
  }
}

// ─── Router ───

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/analyze') {
      return handleAnalyze(request, env)
    }

    if (url.pathname.startsWith('/api/resumes')) {
      return handleResumes(request, env)
    }

    if (url.pathname.startsWith('/api/applications')) {
      return handleApplications(request, env)
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
