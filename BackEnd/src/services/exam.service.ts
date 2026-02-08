import Exam, { IExam } from '../models/exam.model';

// Lấy tất cả bài thi
export const getAllExams = async (filters?: {
  status?: string;
  subject?: string;
  search?: string;
}) => {
  const query: any = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.subject) {
    query.subject = filters.subject;
  }

  if (filters?.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  return await Exam.find(query)
    // .populate('createdBy', 'name email') // Tạm comment, chưa có User model
    .sort({ createdAt: -1 });
};

// Lấy bài thi theo ID
export const getExamById = async (id: string) => {
  const exam = await Exam.findById(id);
    // .populate('createdBy', 'name email'); // Tạm comment
  
  if (!exam) {
    throw new Error('Không tìm thấy bài thi');
  }

  return exam;
};

// Tạo bài thi mới
export const createExam = async (examData: Partial<IExam>) => {
  const exam = new Exam(examData);
  return await exam.save();
};

// Cập nhật bài thi
export const updateExam = async (id: string, examData: Partial<IExam>) => {
  const exam = await Exam.findByIdAndUpdate(
    id,
    { $set: examData },
    { new: true, runValidators: true }
  );

  if (!exam) {
    throw new Error('Không tìm thấy bài thi');
  }

  return exam;
};

// Xóa bài thi
export const deleteExam = async (id: string) => {
  const exam = await Exam.findByIdAndDelete(id);

  if (!exam) {
    throw new Error('Không tìm thấy bài thi');
  }

  return exam;
};

// Lấy bài thi đang diễn ra
export const getActiveExams = async () => {
  const now = new Date();
  
  return await Exam.find({
    status: 'published',
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    // .populate('createdBy', 'name email') // Tạm comment
    .sort({ startDate: -1 });
};

// Lấy bài thi sắp tới
export const getUpcomingExams = async () => {
  const now = new Date();
  
  return await Exam.find({
    status: 'published',
    startDate: { $gt: now },
  })
    // .populate('createdBy', 'name email') // Tạm comment
    .sort({ startDate: 1 })
    .limit(10);
};