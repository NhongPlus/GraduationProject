import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  title: string;
  subject: string;
  description?: string;
  duration: number; // Thời gian làm bài (phút)
  totalQuestions: number;
  passingScore: number;
  status: 'draft' | 'published' | 'archived';
  startDate: Date;
  endDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề bài thi là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tiêu đề không được quá 200 ký tự'],
    },
    subject: {
      type: String,
      required: [true, 'Môn học là bắt buộc'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Mô tả không được quá 1000 ký tự'],
    },
    duration: {
      type: Number,
      required: [true, 'Thời gian làm bài là bắt buộc'],
      min: [1, 'Thời gian làm bài phải lớn hơn 0'],
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Số lượng câu hỏi là bắt buộc'],
      min: [1, 'Số lượng câu hỏi phải lớn hơn 0'],
    },
    passingScore: {
      type: Number,
      required: [true, 'Điểm đạt là bắt buộc'],
      min: [0, 'Điểm đạt không được nhỏ hơn 0'],
      max: [100, 'Điểm đạt không được lớn hơn 100'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu là bắt buộc'],
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày kết thúc là bắt buộc'],
      validate: {
        validator: function (this: IExam, value: Date) {
          return value > this.startDate;
        },
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IExam>('Exam', ExamSchema);