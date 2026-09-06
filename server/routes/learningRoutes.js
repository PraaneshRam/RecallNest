import express from 'express'
import {
  createLearningEntry,
  deleteLearningEntry,
  generateLearningQuestions,
  getLearningEntries,
  getReviewAttempts,
  createReviewAttempt,
} from '../controllers/learningController.js'

const router = express.Router()

router.get('/', getLearningEntries)
router.post('/', createLearningEntry)
router.post('/:id/questions', generateLearningQuestions)
router.get('/:id/reviews', getReviewAttempts)
router.post('/:id/reviews', createReviewAttempt)
router.delete('/:id', deleteLearningEntry)

export default router
