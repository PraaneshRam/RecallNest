import mongoose from 'mongoose'

const studyProjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required.'],
      trim: true,
      maxlength: 80,
    },
  },
  { timestamps: true },
)

studyProjectSchema.index({ user: 1, name: 1 }, { unique: true })

const StudyProject = mongoose.models.StudyProject ?? mongoose.model('StudyProject', studyProjectSchema)

export default StudyProject
