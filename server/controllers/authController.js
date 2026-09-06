import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing.')
  return process.env.JWT_SECRET
}

const createToken = (user) => jwt.sign({ userId: user._id.toString() }, getJwtSecret(), { expiresIn: '7d' })

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
})

export const register = async (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''

  if (!name || !email || password.length < 8) {
    response.status(400).json({ error: 'Name, valid email, and password of at least 8 characters are required.' })
    return
  }

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      response.status(409).json({ error: 'An account with this email already exists.' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash })
    response.status(201).json({ user: publicUser(user), token: createToken(user) })
  } catch {
    response.status(500).json({ error: 'Could not create the account.' })
  }
}

export const login = async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''

  if (!email || !password) {
    response.status(400).json({ error: 'Email and password are required.' })
    return
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash')
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !passwordMatches) {
      response.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    response.json({ user: publicUser(user), token: createToken(user) })
  } catch {
    response.status(500).json({ error: 'Could not sign in.' })
  }
}

export const getCurrentUser = async (request, response) => {
  try {
    const user = await User.findById(request.userId)
    if (!user) {
      response.status(401).json({ error: 'User account no longer exists.' })
      return
    }
    response.json({ user: publicUser(user) })
  } catch {
    response.status(500).json({ error: 'Could not load the account.' })
  }
}
