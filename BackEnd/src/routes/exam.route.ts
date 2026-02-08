import { Router } from 'express';
import {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  getActiveExams,
  getUpcomingExams,
} from '../controllers/exam.controller';

const router = Router();

// Routes đặc biệt (phải đặt trước :id)
router.get('/active', getActiveExams);
router.get('/upcoming', getUpcomingExams);

// Routes cơ bản
router.get('/', getExams);
router.get('/:id', getExam);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;