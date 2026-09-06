import { getApiUrl } from './apiConfig'
import { getSession } from './authService'

export type LearningEntry = {
  _id: string
  topic: string
  notes: string
  reminderDate: string
  createdAt: string
  updatedAt: string
  project?: string
}

export type StudyProject = {
  _id: string
  name: string
  conceptCount: number
  createdAt: string
}

export type RecallQuestion = {
  question: string
  answer: string
  options?: string[]
  correctAnswer?: string
}

export type ReviewAttempt = {
  _id: string
  learningEntry: string
  score: number
  total: number
  createdAt: string
}

type ApiError = { error?: string }

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(getApiUrl(`/api${path}`), {
    headers: {
      'Content-Type': 'application/json',
      ...(getSession()?.token ? { Authorization: `Bearer ${getSession()?.token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  const data = (await response.json().catch(() => ({}))) as T & ApiError

  if (!response.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
  return data
}

export const getLearningEntries = () => request<LearningEntry[]>('/learning')

export const getProjects = () => request<StudyProject[]>('/projects')

export const createProject = (name: string) => request<StudyProject>('/projects', {
  method: 'POST',
  body: JSON.stringify({ name }),
})

export const deleteProject = (id: string) => request<{ message: string }>(`/projects/${id}`, {
  method: 'DELETE',
})

export const createLearningEntry = (entry: Pick<LearningEntry, 'topic' | 'notes' | 'reminderDate'> & { projectId: string }) => request<LearningEntry>('/learning', {
  method: 'POST',
  body: JSON.stringify(entry),
})

export const deleteLearningEntry = (id: string) => request<{ message: string }>(`/learning/${id}`, {
  method: 'DELETE',
})

export const generateLearningQuestions = (id: string) => request<{ questions: RecallQuestion[] }>(`/learning/${id}/questions`, {
  method: 'POST',
})

export const getReviewAttempts = (id: string) => request<ReviewAttempt[]>(`/learning/${id}/reviews`)

export const createReviewAttempt = (id: string, score: number, total: number) => request<{ attempt: ReviewAttempt; entry: LearningEntry; intervalDays: number }>(`/learning/${id}/reviews`, {
  method: 'POST',
  body: JSON.stringify({ score, total }),
})
