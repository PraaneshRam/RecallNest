import mongoose from 'mongoose'

const learningEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyProject',
    },
    topic: {
      type: String,
      required: [true, 'Learning topic is required.'],
      trim: true,
    },
    notes: {
      type: String,
      required: [true, 'Learning notes are required.'],
      trim: true,
    },
    reminderDate: {
      type: Date,
      required: [true, 'Reminder date is required.'],
    },
  },
  {
    timestamps: true,
  },
)

const LearningEntry = mongoose.models.LearningEntry ?? mongoose.model('LearningEntry', learningEntrySchema)

export default LearningEntry
