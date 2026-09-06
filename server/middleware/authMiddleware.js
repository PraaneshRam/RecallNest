import jwt from 'jsonwebtoken'

export const requireAuth = (request, response, next) => {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token || !process.env.JWT_SECRET) {
    response.status(401).json({ error: 'Authentication is required.' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (typeof payload !== 'object' || !payload.userId) throw new Error('Invalid token')
    request.userId = payload.userId
    next()
  } catch {
    response.status(401).json({ error: 'Your session is invalid or expired.' })
  }
}
