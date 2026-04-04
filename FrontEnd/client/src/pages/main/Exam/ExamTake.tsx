import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Title, RadioGroup, Text, Loader, Progress, Alert } from '@mantine/core';
import examApi from '@/services/examApi';
import type { Question } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputRadio from '@/components/Input/InputRadio/InputRadio';

const localKey = (id: string) => `exam_draft_${id}`;

const ExamTake = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const [qs, exams] = await Promise.all([examApi.getExamQuestions(examId), examApi.getExams()]);
        setQuestions(qs);

        const exam = exams.find((item) => item.id === examId);
        const duration = exam?.duration ?? 30;

        const saved = localStorage.getItem(localKey(examId));
        if (saved) {
          setAnswers(JSON.parse(saved));
        }

        const oldSeconds = Number(localStorage.getItem(`exam_time_left_${examId}`));
        setRemainingSeconds(oldSeconds > 0 ? oldSeconds : duration * 60);
      } catch {
        setError('Tải dữ liệu bài thi thất bại.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [examId]);

  useEffect(() => {
    if (!examId || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        localStorage.setItem(`exam_time_left_${examId}`, String(next));
        if (next <= 0) {
          clearInterval(timer);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examId, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds === 0 && examId && questions.length > 0) {
      const submitAuto = async () => {
        try {
          await examApi.submitExam(examId, answers);
          navigate(`/result/${examId}`);
        } catch {
          setError('Tự động nộp bài thất bại.');
        }
      };
      submitAuto();
    }
  }, [remainingSeconds, examId, questions, answers, navigate]);

  const saveDraft = (nextAnswers: Record<number, number>) => {
    setAnswers(nextAnswers);
    if (examId) {
      localStorage.setItem(localKey(examId), JSON.stringify(nextAnswers));
    }
  };

  const handleSubmit = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      await examApi.submitExam(examId, answers);
      localStorage.removeItem(localKey(examId));
      localStorage.removeItem(`exam_time_left_${examId}`);
      navigate(`/result/${examId}`);
    } catch {
      setError('Nộp bài thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!examId) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>Không tìm thấy bài thi</Title>
        <ButtonFilled
          style={{ marginTop: 16 }}
          label="Trở về danh sách bài thi"
          disabled={false}
          onClick={() => navigate('/exams')}
        />
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

  if (questions.length === 0) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Text>Không có câu hỏi cho bài thi này.</Text>
      </Box>
    );
  }

  const done = Object.keys(answers).length;
  const total = questions.length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Title order={2} mb="md">Làm bài: {examId}</Title>

      <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text>Thời gian còn lại: {minutes}:{seconds.toString().padStart(2, '0')}</Text>
        <Text>Tiến độ: {done}/{total}</Text>
      </Box>

      <Box style={{ marginBottom: 16 }}>
        <Progress value={percentage} size="xl" />
        <Text size="sm" style={{ marginTop: 8 }}>{percentage}%</Text>
      </Box>

      {questions.map((q) => (
        <Box key={q.id} mb="lg">
          <Text mb="xs">{q.id}. {q.question}</Text>
          <RadioGroup
            value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
            onChange={(val) => {
              const next = { ...answers, [q.id]: Number(val) };
              saveDraft(next);
            }}
          >
            {q.options.map((option, idx) => (
              <InputRadio key={idx} value={String(idx)} label={option} />
            ))}
          </RadioGroup>
        </Box>
      ))}

      <ButtonFilled
        color="green"
        label="Nộp bài"
        onClick={handleSubmit}
        disabled={questions.some((q) => answers[q.id] === undefined)}
      />

      <Alert title="Lưu nháp" color="blue" mt="md">
        Bài làm đã tự động lưu. Đăng xuất/chuyển tab vẫn giữ trạng thái.
      </Alert>
    </Box>
  );
};

export default ExamTake;
