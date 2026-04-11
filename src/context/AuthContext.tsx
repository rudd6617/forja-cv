import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext, type User } from './authState'
import { setOnUnauthorized } from '../services/resumeApi'

const GOOGLE_CLIENT_ID =
  '808171436763-3q999s0s9mgh1kg451va5inoo0npu20m.apps.googleusercontent.com'

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

const TOKEN_REFRESH_CHECK_MS = 60_000
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60_000

const gsiReady: Promise<void> = new Promise((resolve, reject) => {
  if (typeof google !== 'undefined' && google.accounts?.id) {
    resolve()
    return
  }
  const script = document.createElement('script')
  script.src = GSI_SCRIPT_URL
  script.async = true
  script.onload = () => resolve()
  script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
  document.head.appendChild(script)
})

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

function tokenToUser(token: string): User {
  const payload = decodeJwtPayload(token)
  return {
    googleId: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
    picture: payload.picture as string,
  }
}

function getTokenExpiry(token: string): number {
  try {
    const payload = decodeJwtPayload(token)
    return (payload.exp as number) * 1000
  } catch {
    return 0
  }
}

function restoreToken(): { user: User; token: string } | null {
  const savedToken = localStorage.getItem('cv-id-token')
  if (!savedToken) return null
  if (getTokenExpiry(savedToken) > Date.now()) {
    return { user: tokenToUser(savedToken), token: savedToken }
  }
  localStorage.removeItem('cv-id-token')
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restored] = useState(restoreToken)
  const [user, setUser] = useState<User | null>(restored?.user ?? null)
  const [idToken, setIdToken] = useState<string | null>(restored?.token ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  const handleCredential = useCallback(
    (response: google.accounts.id.CredentialResponse) => {
      const token = response.credential
      setUser(tokenToUser(token))
      setIdToken(token)
      localStorage.setItem('cv-id-token', token)
    },
    [],
  )

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    gsiReady.then(() => {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: true,
      })
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [handleCredential])

  // Auto-refresh: trigger silent re-auth before token expires
  useEffect(() => {
    if (!idToken) return
    const interval = setInterval(() => {
      const expiry = getTokenExpiry(idToken)
      if (expiry - Date.now() < TOKEN_REFRESH_THRESHOLD_MS) {
        google.accounts.id.prompt()
      }
    }, TOKEN_REFRESH_CHECK_MS)
    return () => clearInterval(interval)
  }, [idToken])

  const signIn = useCallback(() => {
    google.accounts.id.prompt()
  }, [])

  const clearAuth = useCallback(() => {
    setUser(null)
    setIdToken(null)
    localStorage.removeItem('cv-id-token')
  }, [])

  const signOut = useCallback(() => {
    if (user) google.accounts.id.revoke(user.email)
    clearAuth()
  }, [user, clearAuth])

  useEffect(() => {
    setOnUnauthorized(clearAuth)
    return () => setOnUnauthorized(null)
  }, [clearAuth])

  return (
    <AuthContext value={{ user, idToken, isLoading, signIn, signOut, clearAuth }}>
      {children}
    </AuthContext>
  )
}
