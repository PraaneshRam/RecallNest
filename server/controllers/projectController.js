import mongoose from 'mongoose'
import LearningEntry from '../models/LearningEntry.js'
import StudyProject from '../models/StudyProject.js'

const isValidId = (id) => mongoose.isObjectIdOrHexString(id)

export const getProjects = async (request, response) => {
  try {
    const uncategorizedCount = await LearningEntry.countDocuments({ user: request.userId, project: { $exists: false } })
    if (uncategorizedCount > 0) {
      let unsorted = await StudyProject.findOne({ user: request.userId, name: 'Unsorted' })
      if (!unsorted) unsorted = await StudyProject.create({ user: request.userId, name: 'Unsorted' })
      await LearningEntry.updateMany({ user: request.userId, project: { $exists: false } }, { $set: { project: unsorted._id } })
    }

    const projects = await StudyProject.find({ user: request.userId }).sort({ createdAt: 1 })
    const counts = await LearningEntry.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(request.userId), project: { $ne: null } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ])
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]))
    response.json(projects.map((project) => ({ ...project.toObject(), conceptCount: countMap.get(project._id.toString()) ?? 0 })))
  } catch {
    response.status(500).json({ error: 'Could not load study projects.' })
  }
}

export const createProject = async (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  if (!name) {
    response.status(400).json({ error: 'Project name is required.' })
    return
  }

  try {
    const project = await StudyProject.create({ user: request.userId, name })
    response.status(201).json({ ...project.toObject(), conceptCount: 0 })
  } catch (error) {
    if (error?.code === 11000) {
      response.status(409).json({ error: 'You already have a project with this name.' })
      return
    }
    response.status(500).json({ error: 'Could not create the study project.' })
  }
}

export const deleteProject = async (request, response) => {
  if (!isValidId(request.params.id)) {
    response.status(400).json({ error: 'Invalid project ID.' })
    return
  }

  try {
    const project = await StudyProject.findOneAndDelete({ _id: request.params.id, user: request.userId })
    if (!project) {
      response.status(404).json({ error: 'Study project not found.' })
      return
    }
    await LearningEntry.updateMany({ user: request.userId, project: request.params.id }, { $unset: { project: 1 } })
    response.json({ message: 'Study project deleted successfully.' })
  } catch {
    response.status(500).json({ error: 'Could not delete the study project.' })
  }
}
