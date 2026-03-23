type Exam = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  status: 'Chưa làm' | 'Đã làm';
};

type Question = {
  id: number;
  question: string;
  options: string[];
  answer: number;
};

type Result = {
  examId: string;
  total: number;
  correct: number;
  percentage: number;
  takenAt: string;
};

const exams: Exam[] = [
  { id: 'exam-1', title: 'Toán đại số', subject: 'Toán', duration: 30, status: 'Chưa làm' },
  { id: 'exam-2', title: 'Lập trình web', subject: 'Tin học', duration: 40, status: 'Chưa làm' },
  { id: 'exam-3', title: 'Tiếng Anh cơ bản', subject: 'Ngoại ngữ', duration: 35, status: 'Đã làm' },
];

const questionBank: Record<string, Question[]> = {
  'exam-1': [
    { id: 1, question: '2 + 2 = ?', options: ['3', '4', '5', '6'], answer: 1 },
    { id: 2, question: '5 - 2 = ?', options: ['1', '2', '3', '4'], answer: 2 },
  ],
  'exam-2': [
    { id: 1, question: 'HTML là viết tắt của?', options: ['Web', 'Website', 'HyperText Markup Language', 'Hosting'], answer: 2 },
    { id: 2, question: 'React là thư viện của?', options: ['Google', 'Apple', 'Facebook', 'Microsoft'], answer: 2 },
  ],
  'exam-3': [
    { id: 1, question: 'How do you say "Xin chào" in English?', options: ['Goodbye', 'Hello', 'Thanks', 'Sorry'], answer: 1 },
    { id: 2, question: 'What is the opposite of "hot"?', options: ['Cold', 'Warm', 'Big', 'Fast'], answer: 0 },
  ],
};

const RESULT_STORAGE_KEY = 'mock_exam_results';

const getPersistentResults = (): Record<string, Result> => {
  try {
    const raw = localStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const setPersistentResults = (results: Record<string, Result>) => {
  localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(results));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const examApi = {
  getExams: async (): Promise<Exam[]> => {
    await delay(200);
    const history = getPersistentResults();
    return exams.map((exam) => ({
      ...exam,
      status: history[exam.id] ? 'Đã làm' : 'Chưa làm',
    }));
  },

  getExamQuestions: async (examId: string): Promise<Question[]> => {
    await delay(200);
    return questionBank[examId] || [];
  },

  submitExam: async (examId: string, answers: Record<number, number>): Promise<Result> => {
    await delay(300);
    const questions = questionBank[examId] || [];
    const correct = questions.reduce((acc, q) => (answers[q.id] === q.answer ? acc + 1 : acc), 0);
    const result: Result = {
      examId,
      total: questions.length,
      correct,
      percentage: Math.round((correct / Math.max(questions.length, 1)) * 100),
      takenAt: new Date().toISOString(),
    };

    const results = getPersistentResults();
    results[examId] = result;
    setPersistentResults(results);

    return result;
  },

  getExamResult: async (examId: string): Promise<Result | null> => {
    await delay(200);
    const results = getPersistentResults();
    return results[examId] || null;
  },

  getAllResults: async (): Promise<Result[]> => {
    await delay(200);
    const results = getPersistentResults();
    return Object.values(results);
  },

  getPrediction: async (): Promise<number> => {
    await delay(200);
    const pastGrades = [85, 78, 80, 74];
    const avg = pastGrades.reduce((sum, val) => sum + val, 0) / pastGrades.length;
    return Math.min(100, Math.round(avg * 0.95 + 5));
  },
};

export type { Exam, Question, Result };
export default examApi;
