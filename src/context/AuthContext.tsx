import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext, type User } from './authState'

const GOOGLE_CLIENT_ID =
  '808171436763-3q999s0s9mgh1kg451va5inoo0npu20m.apps.googleusercontent.com'

const TOKEN_REFRESH_CHECK_MS = 60_000
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60_000

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

    const waitForGsi = () => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          auto_select: true,
        })
        setIsLoading(false)
      } else {
        setTimeout(waitForGsi, 100)
      }
    }
    waitForGsi()
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

  const signOut = useCallback(() => {
    if (user) {
      google.accounts.id.revoke(user.email)
    }
    setUser(null)
    setIdToken(null)
    localStorage.removeItem('cv-id-token')
  }, [user])

  return (
    <AuthContext value={{ user, idToken, isLoading, signIn, signOut }}>
      {children}
    </AuthContext>
  )
}
