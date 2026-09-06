import { getApiUrl } from './apiConfig'
import { getSession } from './authService'

export type Task = {
  _id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

type ApiError = {
  error?: string
}

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

  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong. Please try again.')
  }

  return data
}

export const getTasks = () => request<Task[]>('/tasks')

export const createTask = (title: string) => request<Task>('/tasks', {
  method: 'POST',
  body: JSON.stringify({ title }),
})

export const updateTask = (id: string, updates: Partial<Pick<Task, 'title' | 'completed'>>) => request<Task>(`/tasks/${id}`, {
  method: 'PUT',
  body: JSON.stringify(updates),
})

export const deleteTask = (id: string) => request<{ message: string }>(`/tasks/${id}`, {
  method: 'DELETE',
})
