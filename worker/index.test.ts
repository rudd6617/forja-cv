import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import worker from './index'

// Mock crypto.subtle for JWT verification bypass
const VALID_PAYLOAD = {
  sub: 'google-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/pic.jpg',
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  exp: Math.floor(Date.now() / 1000) + 3600,
}

function base64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const VALID_TOKEN = `${base64url({ alg: 'RS256', kid: 'test-key' })}.${base64url(VALID_PAYLOAD)}.fake-signature`

function mockDB(rows: Record<string, unknown>[] = []) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: rows.length ? 1 : 0 } }),
    all: vi.fn().mockResolvedValue({ results: rows }),
    first: vi.fn().mockResolvedValue(rows[0] ?? null),
  }
  return {
    prepare: vi.fn().mockReturnValue(stmt),
    batch: vi.fn().mockResolvedValue([{}, { results: rows }]),
    _stmt: stmt,
  }
}

function makeEnv(db = mockDB()) {
  return {
    DB: db as unknown as D1Database,
    GOOGLE_CLIENT_ID: 'test-client-id',
    LLM_API_URL: 'https://llm.example.com',
    LLM_MODEL: 'test-model',
  }
}

function makeRequest(path: string, options: RequestInit = {}) {
  return new Request(`https://app.example.com${path}`, {
    headers: {
      Authorization: `Bearer ${VALID_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
    ...options,
  })
}

// Stub Google JWKS fetch and crypto.subtle.verify to accept our test token
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('googleapis.com/oauth2')) {
      return new Response(JSON.stringify({
        keys: [{ kid: 'test-key', kty: 'RSA', n: 'fake', e: 'AQAB' }],
      }))
    }
    return new Response('{}', { status: 500 })
  })

  vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey)
  vi.spyOn(crypto.subtle, 'verify').mockResolvedValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('worker authentication', () => {
  it('rejects request without Authorization header', async () => {
    const req = new Request('https://app.example.com/api/resumes')
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(401)
  })

  it('rejects request with invalid bearer format', async () => {
    const req = new Request('https://app.example.com/api/resumes', {
      headers: { Authorization: 'Basic abc' },
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(401)
  })

  it('rejects expired token', async () => {
    const expiredPayload = { ...VALID_PAYLOAD, exp: Math.floor(Date.now() / 1000) - 100 }
    const expiredToken = `${base64url({ alg: 'RS256', kid: 'test-key' })}.${base64url(expiredPayload)}.fake`

    const req = new Request('https://app.example.com/api/resumes', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(401)
  })
})

describe('GET /api/resumes', () => {
  it('returns list of resumes', async () => {
    const rows = [{ id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', title: 'My CV', updated_at: '2024-01-01' }]
    const db = mockDB(rows)
    const res = await worker.fetch(makeRequest('/api/resumes'), makeEnv(db))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(rows)
  })
})

describe('POST /api/resumes', () => {
  it('creates resume and returns id', async () => {
    const db = mockDB()
    db._stmt.first.mockResolvedValue({ c: 0 })
    const res = await worker.fetch(
      makeRequest('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title: 'New CV', data: '{}' }),
      }),
      makeEnv(db),
    )

    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    expect(body.id).toBeDefined()
  })

  it('rejects missing title', async () => {
    const res = await worker.fetch(
      makeRequest('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ data: '{}' }),
      }),
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('rejects title exceeding max length', async () => {
    const res = await worker.fetch(
      makeRequest('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title: 'x'.repeat(201), data: '{}' }),
      }),
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('rejects when user hits resume limit', async () => {
    const db = mockDB()
    db._stmt.first.mockResolvedValue({ c: 50 })
    const res = await worker.fetch(
      makeRequest('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title: 'CV', data: '{}' }),
      }),
      makeEnv(db),
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('50')
  })
})

describe('GET /api/resumes/:id', () => {
  it('returns resume data', async () => {
    const row = { id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', title: 'CV', data: '{}', updated_at: '2024-01-01' }
    const db = mockDB([row])
    const res = await worker.fetch(makeRequest('/api/resumes/a0b1c2d3-e4f5-6789-abcd-ef0123456789'), makeEnv(db))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(row)
  })

  it('returns 404 for non-existent resume', async () => {
    const db = mockDB()
    const res = await worker.fetch(makeRequest('/api/resumes/00000000-0000-0000-0000-000000000000'), makeEnv(db))
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/resumes/:id', () => {
  it('updates resume and returns updated_at', async () => {
    const db = mockDB([{ id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', updated_at: '2024-06-01T00:00:00' }])
    const res = await worker.fetch(
      makeRequest('/api/resumes/a0b1c2d3-e4f5-6789-abcd-ef0123456789', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      }),
      makeEnv(db),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; updated_at: string }
    expect(body.ok).toBe(true)
    expect(body.updated_at).toBeDefined()
  })

  it('returns 404 for non-existent resume', async () => {
    const db = mockDB()
    const res = await worker.fetch(
      makeRequest('/api/resumes/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        body: JSON.stringify({ title: 'X' }),
      }),
      makeEnv(db),
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 when updated_at does not match (optimistic locking)', async () => {
    const db = mockDB([{ id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789' }])
    // run returns 0 changes (stale updated_at), but first still finds the row (it exists)
    db._stmt.run.mockResolvedValue({ meta: { changes: 0 } })
    // first() is called once for the exists check after 0 changes - default mock returns the row
    const res = await worker.fetch(
      makeRequest('/api/resumes/a0b1c2d3-e4f5-6789-abcd-ef0123456789', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Stale', updated_at: '2024-01-01T00:00:00' }),
      }),
      makeEnv(db),
    )
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/resumes/:id', () => {
  it('deletes resume', async () => {
    const db = mockDB([{ id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789' }])
    const res = await worker.fetch(
      makeRequest('/api/resumes/a0b1c2d3-e4f5-6789-abcd-ef0123456789', { method: 'DELETE' }),
      makeEnv(db),
    )
    expect(res.status).toBe(200)
  })

  it('returns 404 for non-existent resume', async () => {
    const db = mockDB()
    const res = await worker.fetch(
      makeRequest('/api/resumes/00000000-0000-0000-0000-000000000000', { method: 'DELETE' }),
      makeEnv(db),
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/analyze', () => {
  it('rejects non-POST method', async () => {
    const res = await worker.fetch(makeRequest('/api/analyze'), makeEnv())
    expect(res.status).toBe(405)
  })

  it('rejects invalid body', async () => {
    const res = await worker.fetch(
      makeRequest('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ bad: true }),
      }),
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('rejects oversized JD', async () => {
    const res = await worker.fetch(
      makeRequest('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          jd: 'x'.repeat(10_001),
          resume: { summary: 'test', experience: [] },
        }),
      }),
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })
})

describe('unknown routes', () => {
  it('returns 404', async () => {
    const res = await worker.fetch(
      new Request('https://app.example.com/api/unknown'),
      makeEnv(),
    )
    expect(res.status).toBe(404)
  })
})

describe('method not allowed', () => {
  it('rejects PATCH on /api/resumes/:id', async () => {
    const res = await worker.fetch(
      makeRequest('/api/resumes/a0b1c2d3-e4f5-6789-abcd-ef0123456789', { method: 'PATCH' }),
      makeEnv(),
    )
    expect(res.status).toBe(405)
  })
})
