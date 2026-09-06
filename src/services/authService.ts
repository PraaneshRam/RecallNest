export type AuthUser = {
  id: string
  name: string
  email: string
}

export type AuthSession = {
  user: AuthUser
  token: string
}

const sessionKey = 'task-manager-session'

export const getSession = (): AuthSession | null => {
  const saved = localStorage.getItem(sessionKey)
  if (!saved) return null
  try {
    return JSON.parse(saved) as AuthSession
  } catch {
    localStorage.removeItem(sessionKey)
    return null
  }
}

export const saveSession = (session: AuthSession) => {
  localStorage.setItem(sessionKey, JSON.stringify(session))
}

export const clearSession = () => localStorage.removeItem(sessionKey)

const request = async (path: string, body: { name?: string; email: string; password: string }) => {
  let response: Response
  try {
    response = await fetch(`/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the backend. Run npm run server and try again.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? 'Authentication failed.')
  return data as AuthSession
}

export const register = (name: string, email: string, password: string) => request('/register', { name, email, password })
export const login = (email: string, password: string) => request('/login', { email, password })
