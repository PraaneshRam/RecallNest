import mongoose from 'mongoose'
import Task from '../models/Task.js'

const isValidTaskId = (id) => mongoose.isObjectIdOrHexString(id)

export const getTasks = async (request, response) => {
  try {
    const tasks = await Task.find({ user: request.userId }).sort({ createdAt: -1 })
    response.json(tasks)
  } catch {
    response.status(500).json({ error: 'Could not load tasks.' })
  }
}

export const getTask = async (request, response) => {
  if (!isValidTaskId(request.params.id)) {
    response.status(400).json({ error: 'Invalid task ID.' })
    return
  }

  try {
    const task = await Task.findOne({ _id: request.params.id, user: request.userId })

    if (!task) {
      response.status(404).json({ error: 'Task not found.' })
      return
    }

    response.json(task)
  } catch {
    response.status(500).json({ error: 'Could not load the task.' })
  }
}

export const createTask = async (request, response) => {
  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : ''

  if (!title) {
    response.status(400).json({ error: 'Task title is required.' })
    return
  }

  try {
    const task = await Task.create({ title, user: request.userId })
    response.status(201).json(task)
  } catch {
    response.status(500).json({ error: 'Could not create the task.' })
  }
}

export const updateTask = async (request, response) => {
  if (!isValidTaskId(request.params.id)) {
    response.status(400).json({ error: 'Invalid task ID.' })
    return
  }

  const updates = {}

  if (Object.hasOwn(request.body ?? {}, 'title')) {
    if (typeof request.body.title !== 'string' || !request.body.title.trim()) {
      response.status(400).json({ error: 'Task title must be a non-empty string.' })
      return
    }
    updates.title = request.body.title.trim()
  }

  if (Object.hasOwn(request.body ?? {}, 'completed')) {
    if (typeof request.body.completed !== 'boolean') {
      response.status(400).json({ error: 'Completed must be a boolean.' })
      return
    }
    updates.completed = request.body.completed
  }

  if (Object.keys(updates).length === 0) {
    response.status(400).json({ error: 'Provide a title or completed value to update.' })
    return
  }

  try {
    const task = await Task.findOneAndUpdate({ _id: request.params.id, user: request.userId }, updates, {
      new: true,
      runValidators: true,
    })

    if (!task) {
      response.status(404).json({ error: 'Task not found.' })
      return
    }

    response.json(task)
  } catch {
    response.status(500).json({ error: 'Could not update the task.' })
  }
}

export const deleteTask = async (request, response) => {
  if (!isValidTaskId(request.params.id)) {
    response.status(400).json({ error: 'Invalid task ID.' })
    return
  }

  try {
    const task = await Task.findOneAndDelete({ _id: request.params.id, user: request.userId })

    if (!task) {
      response.status(404).json({ error: 'Task not found.' })
      return
    }

    response.json({ message: 'Task deleted successfully.' })
  } catch {
    response.status(500).json({ error: 'Could not delete the task.' })
  }
}
