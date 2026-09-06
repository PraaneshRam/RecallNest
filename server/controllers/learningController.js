import mongoose from 'mongoose'
import LearningEntry from '../models/LearningEntry.js'
import ReviewAttempt from '../models/ReviewAttempt.js'
import StudyProject from '../models/StudyProject.js'

const isValidEntryId = (id) => mongoose.isObjectIdOrHexString(id)

const getToday = () => new Date().toISOString().slice(0, 10)

export const getLearningEntries = async (request, response) => {
  try {
    const entries = await LearningEntry.find({ user: request.userId }).sort({ reminderDate: 1, createdAt: -1 })
    response.json(entries)
  } catch {
    response.status(500).json({ error: 'Could not load learning entries.' })
  }
}

export const createLearningEntry = async (request, response) => {
  const topic = typeof request.body?.topic === 'string' ? request.body.topic.trim() : ''
  const notes = typeof request.body?.notes === 'string' ? request.body.notes.trim() : ''
  const reminderDate = request.body?.reminderDate
  const projectId = request.body?.projectId

  if (!topic || !notes || !reminderDate || Number.isNaN(Date.parse(reminderDate)) || !projectId) {
    response.status(400).json({ error: 'Project, topic, notes, and a valid reminder date are required.' })
    return
  }

  try {
    const project = await StudyProject.findOne({ _id: projectId, user: request.userId })
    if (!project) {
      response.status(404).json({ error: 'Study project not found.' })
      return
    }
    const entry = await LearningEntry.create({ user: request.userId, project: projectId, topic, notes, reminderDate })
    response.status(201).json(entry)
  } catch {
    response.status(500).json({ error: 'Could not save the learning entry.' })
  }
}

export const deleteLearningEntry = async (request, response) => {
  if (!isValidEntryId(request.params.id)) {
    response.status(400).json({ error: 'Invalid learning entry ID.' })
    return
  }

  try {
    const entry = await LearningEntry.findOneAndDelete({ _id: request.params.id, user: request.userId })

    if (!entry) {
      response.status(404).json({ error: 'Learning entry not found.' })
      return
    }

    await ReviewAttempt.deleteMany({ learningEntry: request.params.id, user: request.userId })

    response.json({ message: 'Learning entry deleted successfully.' })
  } catch {
    response.status(500).json({ error: 'Could not delete the learning entry.' })
  }
}

export const getReviewAttempts = async (request, response) => {
  if (!isValidEntryId(request.params.id)) {
    response.status(400).json({ error: 'Invalid learning entry ID.' })
    return
  }

  try {
    const attempts = await ReviewAttempt.find({ learningEntry: request.params.id, user: request.userId }).sort({ createdAt: -1 }).limit(10)
    response.json(attempts)
  } catch {
    response.status(500).json({ error: 'Could not load review history.' })
  }
}

export const createReviewAttempt = async (request, response) => {
  if (!isValidEntryId(request.params.id)) {
    response.status(400).json({ error: 'Invalid learning entry ID.' })
    return
  }

  const score = request.body?.score
  const total = request.body?.total
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || score < 0 || score > total) {
    response.status(400).json({ error: 'Score and total must be valid whole numbers.' })
    return
  }

  try {
    const entry = await LearningEntry.findOne({ _id: request.params.id, user: request.userId })
    if (!entry) {
      response.status(404).json({ error: 'Learning entry not found.' })
      return
    }

    const attempt = await ReviewAttempt.create({ user: request.userId, learningEntry: request.params.id, score, total })
    const percentage = score / total
    const intervalDays = percentage === 1 ? 14 : percentage >= 0.6 ? 7 : 1
    const nextReminder = new Date()
    nextReminder.setDate(nextReminder.getDate() + intervalDays)
    nextReminder.setHours(0, 0, 0, 0)
    entry.reminderDate = nextReminder
    await entry.save()

    response.status(201).json({ attempt, entry, intervalDays })
  } catch {
    response.status(500).json({ error: 'Could not save review progress.' })
  }
}

export const generateLearningQuestions = async (request, response) => {
  if (!isValidEntryId(request.params.id)) {
    response.status(400).json({ error: 'Invalid learning entry ID.' })
    return
  }

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    response.status(503).json({ error: 'AI questions are not configured yet. Add AI_API_KEY to the backend .env file.' })
    return
  }

  try {
    const entry = await LearningEntry.findOne({ _id: request.params.id, user: request.userId })

    if (!entry) {
      response.status(404).json({ error: 'Learning entry not found.' })
      return
    }

    if (entry.reminderDate.toISOString().slice(0, 10) > getToday()) {
      response.status(400).json({ error: 'This learning entry is not due for recall yet.' })
      return
    }

    const aiResponse = await fetch(process.env.AI_API_URL ?? 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Create five concise multiple-choice active-recall questions from the student notes. Return only JSON in the shape {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","answer":"..."}]}. The correctAnswer must exactly match one option.'
          },
          {
            role: 'user',
            content: `Topic:\n${entry.topic}\n\nStudent notes:\n${entry.notes}`,
          },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const providerBody = await aiResponse.text()
      let providerMessage = `Provider returned HTTP ${aiResponse.status}.`
      try {
        const providerError = JSON.parse(providerBody)
        if (typeof providerError?.error?.message === 'string') providerMessage = providerError.error.message
      } catch {
        // Keep the generic status when the provider does not return JSON.
      }
      response.status(502).json({ error: `AI provider rejected the request: ${providerMessage}` })
      return
    }

    const providerData = await aiResponse.json()
    const content = providerData.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? JSON.parse(content) : null
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : []

    if (questions.length === 0 || questions.some((item) => typeof item.question !== 'string' || typeof item.answer !== 'string' || !Array.isArray(item.options) || item.options.length < 2 || typeof item.correctAnswer !== 'string' || !item.options.includes(item.correctAnswer))) {
      response.status(502).json({ error: 'The AI returned an invalid question format.' })
      return
    }

    response.json({ questions })
  } catch {
    response.status(502).json({ error: 'The AI question service is unavailable right now.' })
  }
}
