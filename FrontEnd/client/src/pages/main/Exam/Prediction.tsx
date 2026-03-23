import { useEffect, useState } from 'react';
import { Box, Title, Text, Progress, Table, Button, Loader } from '@mantine/core';
import examApi from '@/services/examApi';

const pastGrades = [
  { subject: 'Toán', score: 85 },
  { subject: 'Tin học', score: 78 },
  { subject: 'Tiếng Anh', score: 80 },
  { subject: 'Vật lý', score: 74 },
];

const Prediction = () => {
  const [prediction, setPrediction] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getPrediction = async () => {
      try {
        setLoading(true);
        const value = await examApi.getPrediction();
        setPrediction(value);
      } catch {
        setError('Không lấy được dự đoán điểm.');
      } finally {
        setLoading(false);
      }
    };

    getPrediction();
  }, []);

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

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Title order={2}>Dự đoán điểm AI</Title>
      <Text mt="sm">Dựa trên điểm các môn trước</Text>

      <Table mt="md" striped>
        <thead>
          <tr>
            <th>Môn</th>
            <th>Điểm</th>
          </tr>
        </thead>
        <tbody>
          {pastGrades.map((item) => (
            <tr key={item.subject}>
              <td>{item.subject}</td>
              <td>{item.score}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Box mt="md">
        <Text>Điểm dự đoán:</Text>
        <Text size="xl" style={{ fontWeight: 700 }}>{prediction}%</Text>
        <Progress value={prediction} mt="xs" />
      </Box>

      <Button mt="lg" onClick={() => window.location.href = '/dashboard'}>
        Quay lại Dashboard
      </Button>
    </Box>
  );
};

export default Prediction;
