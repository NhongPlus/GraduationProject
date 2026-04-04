import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Title, Table, Loader, Text, Select, Stack } from '@mantine/core';
import examApi from '@/services/examApi';
import type { Exam } from '@/services/examApi';
import InputText from '@/components/Input/InputText/InputText';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

const ExamList = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Chưa làm' | 'Đã làm'>('all');


  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await examApi.getExams();
        setExams(data);
      } catch {
        setError('Lấy danh sách bài thi thất bại.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesText = exam.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [exams, searchText, statusFilter]);

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
      <Title order={2} mb="md">
        Danh sách bài thi
      </Title>

      <Stack mb="md" gap="sm">
        <InputText
          placeholder="Tìm theo tên bài thi..."
          value={searchText}
          onChange={(event) => setSearchText(event.currentTarget.value)}
        />
        <Select
          label="Lọc trạng thái"
          value={statusFilter}
          onChange={(value) => setStatusFilter((value as 'all' | 'Chưa làm' | 'Đã làm') ?? 'all')}
          data={[
            { value: 'all', label: 'Tất cả' },
            { value: 'Chưa làm', label: 'Chưa làm' },
            { value: 'Đã làm', label: 'Đã làm' },
          ]}
        />
      </Stack>

      <Table verticalSpacing="sm" highlightOnHover>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên bài thi</th>
            <th>Môn</th>
            <th>Thời gian (phút)</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredExams.length > 0 ? (
            filteredExams.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>{item.title}</td>
                <td>{item.subject}</td>
                <td>{item.duration}</td>
                <td>{item.status}</td>
                <td>
                  <ButtonFilled
                    size="xs"
                    color="blue"
                    label="Làm bài"
                    disabled={false}
                    onClick={() => navigate(`/exam/${item.id}`)}
                  />
                  <ButtonFilled
                    size="xs"
                    style={{ marginLeft: 8 }}
                    color="gray"
                    label="Kết quả"
                    disabled={item.status === 'Chưa làm'}
                    onClick={() => navigate(`/result/${item.id}`)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                <Text style={{ textAlign: 'center' }} color="dimmed">
                  Không tìm thấy bài thi phù hợp.
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Box>
  );
};

export default ExamList;
