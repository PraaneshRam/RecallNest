import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import authRoutes from './routes/authRoutes.js'
import learningRoutes from './routes/learningRoutes.js'
import { requireAuth } from './middleware/authMiddleware.js'
import projectRoutes from './routes/projectRoutes.js'
import taskRoutes from './routes/taskRoutes.js'

dotenv.config()

const port = Number(process.env.PORT ?? 5000)
const mongoUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB ?? 'task_manager'

if (!mongoUri) {
  throw new Error('MONGODB_URI is missing. Create a .env file from .env.example.')
} 


const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/tasks', requireAuth, taskRoutes)
app.use('/api/learning', requireAuth, learningRoutes)
app.use('/api/projects', requireAuth, projectRoutes)

app.get('/api/health', (_request, response) => {
  response.json({
    connected: mongoose.connection.readyState === 1,
    database: databaseName,
  })
})

const startServer = async () => {
  await mongoose.connect(mongoUri, { dbName: databaseName })
  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('MongoDB connection failed:', error.message)
  process.exit(1)
})

const shutdown = async () => {
  await mongoose.disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
