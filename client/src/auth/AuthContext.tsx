import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../lib/api'
import type { AuthUser, LoginInput, RegisterInput } from '../types'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: AuthUser | null
  /** Short-lived access token for authenticated API calls. */
  accessToken: string | null
  status: Status
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  /** Re-fetch the current user (e.g. after verifying an email). */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  // Restore a session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let cancelled = false
    api
      .refreshSession()
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setAccessToken(res.accessToken)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setAccessToken(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (input: LoginInput) => {
    const res = await api.login(input)
    setUser(res.user)
    setAccessToken(res.accessToken)
    setStatus('authenticated')
  }, [])

  const signUp = useCallback(async (input: RegisterInput) => {
    const res = await api.register(input)
    setUser(res.user)
    setAccessToken(res.accessToken)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Ignore network errors — the client is signed out either way.
    }
    setUser(null)
    setAccessToken(null)
    setStatus('anonymous')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await api.refreshSession()
      setUser(res.user)
      setAccessToken(res.accessToken)
      setStatus('authenticated')
    } catch {
      // Keep the current session; a failed refresh is not fatal here.
    }
  }, [])

  const value = useMemo(
    () => ({ user, accessToken, status, signIn, signUp, signOut, refresh }),
    [user, accessToken, status, signIn, signUp, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
