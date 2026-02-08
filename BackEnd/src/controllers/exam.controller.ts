import { Request, Response } from 'express';
import * as examService from '../services/exam.service';

// GET /api/exams - Lấy tất cả bài thi
export const getExams = async (req: Request, res: Response) => {
  try {
    const { status, subject, search } = req.query;
    
    const exams = await examService.getAllExams({
      status: status as string,
      subject: subject as string,
      search: search as string,
    });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài thi',
      error: error.message,
    });
  }
};

// GET /api/exams/:id - Lấy bài thi theo ID
export const getExam = async (req: Request, res: Response) => {
  try {
    const exam = await examService.getExamById(req.params.id);

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/exams - Tạo bài thi mới
export const createExam = async (req: Request, res: Response) => {
  try {
    // Giả sử có middleware xác thực user
    // const userId = req.user.id;
    const userId = '507f1f77bcf86cd799439011'; // ID giả định

    const examData = {
      ...req.body,
      createdBy: userId,
    };

    const exam = await examService.createExam(examData);

    res.status(201).json({
      success: true,
      message: 'Tạo bài thi thành công',
      data: exam,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Lỗi khi tạo bài thi',
      error: error.message,
    });
  }
};

// PUT /api/exams/:id - Cập nhật bài thi
export const updateExam = async (req: Request, res: Response) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Cập nhật bài thi thành công',
      data: exam,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật bài thi',
      error: error.message,
    });
  }
};

// DELETE /api/exams/:id - Xóa bài thi
export const deleteExam = async (req: Request, res: Response) => {
  try {
    await examService.deleteExam(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa bài thi thành công',
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/exams/active - Lấy bài thi đang diễn ra
export const getActiveExams = async (req: Request, res: Response) => {
  try {
    const exams = await examService.getActiveExams();

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài thi đang diễn ra',
      error: error.message,
    });
  }
};

// GET /api/exams/upcoming - Lấy bài thi sắp tới
export const getUpcomingExams = async (req: Request, res: Response) => {
  try {
    const exams = await examService.getUpcomingExams();

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài thi sắp tới',
      error: error.message,
    });
  }
};