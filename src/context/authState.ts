import { createContext } from 'react'

export interface User {
  googleId: string
  email: string
  name: string
  picture: string
}

export interface AuthState {
  user: User | null
  idToken: string | null
  isLoading: boolean
  signIn: () => void
  signOut: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
