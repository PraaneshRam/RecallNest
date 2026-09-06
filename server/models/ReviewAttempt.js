import mongoose from 'mongoose'

const reviewAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    learningEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningEntry',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
)

const ReviewAttempt = mongoose.models.ReviewAttempt ?? mongoose.model('ReviewAttempt', reviewAttemptSchema)

export default ReviewAttempt
