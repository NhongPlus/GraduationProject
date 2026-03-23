import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Title, Text, Button, Loader, Table, Badge } from '@mantine/core';
import examApi from '@/services/examApi';
import type { Result, Question } from '@/services/examApi';

const ExamResult = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const data = await examApi.getExamResult(examId);
        setResult(data);
        const qs = await examApi.getExamQuestions(examId);
        setQuestions(qs);
      } catch {
        setError('Không tải được kết quả.');
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId]);

  if (!examId) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>Bài thi không hợp lệ</Title>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>Chưa có kết quả cho bài thi này</Title>
        <Button mt="md" onClick={() => navigate('/exams')}>
          Quay lại danh sách bài thi
        </Button>
      </Box>
    );
  }

  const perQuestion = questions.map((q) => {
    const stored = localStorage.getItem(`exam_draft_${examId}`);
    const draft = stored ? (JSON.parse(stored) as Record<number, number>) : {};
    const selected = draft[q.id];
    const isCorrect = selected === q.answer;
    return { ...q, selected, isCorrect };
  });

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Title order={2}>Kết quả bài thi {examId}</Title>
      <Text mt="md">Số câu đúng: {result.correct} / {result.total}</Text>
      <Text>Điểm (%): {result.percentage}%</Text>
      <Text mt="sm">Thời gian làm: {new Date(result.takenAt).toLocaleString()}</Text>

      <Table mt="md" striped>
        <thead>
          <tr>
            <th>Câu</th>
            <th>Đáp án bạn chọn</th>
            <th>Đáp án đúng</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {perQuestion.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.selected !== undefined ? row.options[row.selected] : '—'}</td>
              <td>{row.options[row.answer]}</td>
              <td>
                <Badge color={row.isCorrect ? 'green' : 'red'}>
                  {row.isCorrect ? 'Đúng' : 'Sai'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button mt="md" onClick={() => navigate('/prediction')}>
        Xem dự đoán điểm AI
      </Button>
    </Box>
  );
};

export default ExamResult;
