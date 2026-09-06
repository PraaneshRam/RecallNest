import { useState } from 'react'
import { login, register, saveSession, type AuthSession } from '../services/authService'

type AuthPageProps = {
  onSuccess: (session: AuthSession) => void
}

function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const session = mode === 'login' ? await login(email, password) : await register(name, email, password)
      saveSession(session)
      onSuccess(session)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow"><span className="brand-mark">RN</span> RecallNest</p>
        <h1>{mode === 'login' ? <>Welcome<br /><em>back.</em></> : <>Start your<br /><em>learning loop.</em></>}</h1>
        <p className="intro">Keep tasks and learning recall private to your account.</p>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'is-selected' : ''} type="button" onClick={() => { setMode('login'); setError('') }}>Sign in</button>
          <button className={mode === 'register' ? 'is-selected' : ''} type="button" onClick={() => { setMode('register'); setError('') }}>Create account</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        {mode === 'register' && <p className="auth-hint">Use at least 8 characters for your password.</p>}
      </div>
    </main>
  )
}

export default AuthPage
