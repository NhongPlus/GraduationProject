import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Alert, Stack, Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

type ExamProctorMeta = {
  exam_id: string;
  exam_title: string;
  total_sessions: number;
  active_sessions: number;
  submitted_sessions: number;
};

const ProctoringList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<ExamProctorMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Lấy danh sách exam mà teacher/admin có quyền proctor
        const exams = await examApi.getExams();
        const withSessions = await Promise.all(
          exams.map(async (e) => {
            try {
              const proctorData = await examApi.getExamProctoring(e.id);
              return {
                exam_id: e.id,
                exam_title: e.title,
                total_sessions: proctorData.total_sessions,
                active_sessions: proctorData.active_sessions,
                submitted_sessions: proctorData.submitted_sessions,
              };
            } catch {
              return null;
            }
          })
        );
        setData(withSessions.filter(Boolean) as ExamProctorMeta[]);
      } catch {
        setError(t('proctoring.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

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
        <Alert color="red" variant="light">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('proctoring.list_title')}</Title>

        {data.length === 0 && (
          <Alert color="blue" variant="light">{t('proctoring.no_exams')}</Alert>
        )}

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('proctoring.exam_title')}</Table.Th>
                <Table.Th>{t('proctoring.total_sessions')}</Table.Th>
                <Table.Th>{t('proctoring.active')}</Table.Th>
                <Table.Th>{t('proctoring.submitted')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((exam, idx) => (
                <Table.Tr key={exam.exam_id}>
                  <Table.Td>{idx + 1}</Table.Td>
                  <Table.Td>
                    <Text fw={500}>{exam.exam_title}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="gray">{exam.total_sessions}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={exam.active_sessions > 0 ? 'orange' : 'gray'}>
                      {exam.active_sessions}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green">{exam.submitted_sessions}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <ButtonFilled
                      size="xs"
                      label={t('proctoring.monitor')}
                      disabled={exam.total_sessions === 0}
                      onClick={() => navigate(`/proctoring/${exam.exam_id}`)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ProctoringList;