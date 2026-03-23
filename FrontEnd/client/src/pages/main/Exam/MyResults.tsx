import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Title, Table, Loader, Text, Button } from '@mantine/core';
import examApi from '@/services/examApi';
import type { Result } from '@/services/examApi';

const MyResults = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await examApi.getAllResults();
        setResults(data);
      } catch {
        setError('Không tải được kết quả.');
      } finally {
        setLoading(false);
      }
    };

    load();
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
      <Title order={2} mb="md">Kết quả của tôi</Title>
      <Table verticalSpacing="sm" highlightOnHover>
        <thead>
          <tr>
            <th>STT</th>
            <th>Bài thi</th>
            <th>Đúng</th>
            <th>Tổng</th>
            <th>%</th>
            <th>Thời gian</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, idx) => (
            <tr key={item.examId}>
              <td>{idx + 1}</td>
              <td>{item.examId}</td>
              <td>{item.correct}</td>
              <td>{item.total}</td>
              <td>{item.percentage}%</td>
              <td>{new Date(item.takenAt).toLocaleString()}</td>
              <td>
                <Button size="xs" onClick={() => navigate(`/result/${item.examId}`)}>
                  Xem
                </Button>
              </td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr>
              <td colSpan={7}>
                <Text style={{ textAlign: 'center' }}>Chưa có kết quả nào.</Text>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Box>
  );
};

export default MyResults;
