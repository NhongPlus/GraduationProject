import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, Divider,
  Pagination,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { ExamSession } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';

const ExamSessions = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await examApi.getExamSessions(examId, { page, limit: LIMIT });
        setSessions(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / LIMIT)));
      } catch {
        setError(t('errors.session_list_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, t, page]);

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

  const pendingGrading = sessions.filter((s) => s.grading_status === 'pending_manual');
  const versionCountLabel = (() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const code = s.version_code ?? '—';
      map.set(code, (map.get(code) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, n]) => `${code}: ${n}`)
      .join(' · ');
  })();

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('exam_sessions.title')}
          subtitle={t('exam_sessions.subtitle')}
          accent="teal"
          action={
            <Group gap="xs">
              <Badge color="blue" size="lg">{sessions.length} {t('exam_sessions.total')}</Badge>
              {sessions.length > 0 && versionCountLabel && (
                <Badge color="violet" size="lg" variant="light">
                  {versionCountLabel}
                </Badge>
              )}
            </Group>
          }
        />

        {pendingGrading.length > 0 && (
          <Alert color="yellow" variant="light">
            {t('exam_sessions.pending_grading_alert', { count: pendingGrading.length })}
          </Alert>
        )}

        <Paper withBorder radius="md" p="sm">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('exam_sessions.student')}</Table.Th>
                <Table.Th>{t('exam_sessions.version_code')}</Table.Th>
                <Table.Th>{t('exam_sessions.status')}</Table.Th>
                <Table.Th>{t('exam_sessions.score')}</Table.Th>
                <Table.Th>{t('exam_sessions.grading_status')}</Table.Th>
                <Table.Th>{t('exam_sessions.submitted_at')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session, idx) => (
                <Table.Tr key={session.id}>
                  <Table.Td>{idx + 1}</Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {session.student_name || session.full_name || session.student_id}
                    </Text>
                    {session.student_email && (
                      <Text size="xs" c="dimmed">{session.student_email}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={session.status === 'submitted' ? 'green' : session.status === 'active' ? 'orange' : 'gray'}>
                      {session.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {session.score != null ? `${session.score}/${session.max_points}` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={session.grading_status === 'pending_manual' ? 'yellow' : 'green'}>
                      {session.grading_status === 'pending_manual' ? t('exam_sessions.pending_manual') : t('exam_sessions.graded')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ButtonLight
                        size="xs"
                        label={t('exam_sessions.view_grading')}
                        disabled={session.grading_status === 'complete'}
                        onClick={() => navigate(`/grading/${session.id}`)}
                      />
                      {session.status === 'active' && (
                        <ButtonLight
                          size="xs"
                          color="cyan"
                          label={t('proctoring.title')}
                          disabled={false}
                          onClick={() => navigate(`/proctoring/${examId}`)}
                        />
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center">{t('exam_sessions.no_sessions')}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        <Group>
          <ButtonLight
            size="sm"
            color="gray"
            label={t('common.back')}
            disabled={false}
            onClick={() => navigate('/exams')}
          />
        </Group>

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Stack>
    </Box>
  );
};

export default ExamSessions;