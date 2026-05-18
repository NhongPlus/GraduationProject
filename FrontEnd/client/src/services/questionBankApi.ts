import apiClient from './apiClient';
import type { QuestionType } from './examApi';

export type QBDifficulty = 'DE' | 'TRUNGBINH' | 'KHO';

export interface QuestionBankItem {
  id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  difficulty: QBDifficulty;
  chapter: number | null;
  subject_id: string | null;
  tags: string[];
  usage_count: number;
}

export interface QuestionBankListParams {
  subject_id?: string;
  search?: string;
  question_type?: QuestionType;
  difficulty?: QBDifficulty;
  limit?: number;
  offset?: number;
}

const questionBankApi = {
  list: async (params: QuestionBankListParams = {}): Promise<{ items: QuestionBankItem[]; total: number }> => {
    const query: Record<string, string> = {
      limit: String(Math.min(params.limit ?? 100, 100)),
      offset: String(params.offset ?? 0),
    };
    if (params.subject_id) query.subject_id = params.subject_id;
    if (params.search) query.search = params.search;
    if (params.question_type) query.question_type = params.question_type;
    if (params.difficulty) query.difficulty = params.difficulty;

    const res = await apiClient.get<{
      success: boolean;
      data: { items: QuestionBankItem[]; total: number };
    }>('/question-bank', { params: query });
    return res.data.data;
  },

  importToExam: async (
    questionBankId: string,
    examId: string,
    opts?: { version_index?: number }
  ): Promise<{ question_id: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { question_id: string };
    }>(`/question-bank/${questionBankId}/import/${examId}`, opts ?? {});
    return res.data.data;
  },
};

export default questionBankApi;
