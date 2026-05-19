import type { NavigateFunction } from 'react-router-dom';
import { requestExamFullscreen } from '@/utils/examFullscreen';

/** Vào phòng thi: bật fullscreen (bắt buộc) trong cùng thao tác click, rồi điều hướng. */
export async function enterExamRoom(navigate: NavigateFunction, examId: string): Promise<void> {
  await requestExamFullscreen();
  navigate(`/exam/${examId}`);
}
