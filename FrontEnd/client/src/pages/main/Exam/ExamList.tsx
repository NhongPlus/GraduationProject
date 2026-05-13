import { useNavigate } from 'react-router-dom';
import {
  Box,
  Title,
  Table,
  Loader,
  Text,
  Select,
  Stack,
  Paper,
  Group,
  Badge,
  Alert,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import { useExamListState } from '@/hooks/useExamListState';
import InputText from '@/components/Input/InputText/InputText';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { isPastExamStartDeadline } from '@/utils/examDeadline';

const ExamList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isStaff = userRole === 'admin' || userRole === 'teacher';
  const {
    exams,
    loading,
    error,
    notice,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    startingExamId,
    updatingExamId,
    forceSubmittingExamId,
    latestSessionByExam,
    activeSessionCountByExam,
    filteredExams,
    doneCount,
    handleStartExam,
    handleUpdateDuration,
    handleForceSubmit,
  } = useExamListState({ isStaff, t });

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
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('exam_list.title')}</Title>
          {isStaff && (
            <ButtonFilled
              size="sm"
              color="blue"
              label={t('exam_list.action_create')}
              disabled={false}
              onClick={() => navigate('/exams/new')}
            />
          )}
        </Group>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_list.total_exams')}</Text>
            <Text fw={700} size="xl">{exams.length}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_list.done_exams')}</Text>
            <Text fw={700} size="xl">
              {doneCount}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_list.not_done_exams')}</Text>
            <Text fw={700} size="xl">
              {Math.max(0, exams.length - doneCount)}
            </Text>
          </Paper>
        </Group>

        {!!notice && <Alert color="green" variant="light">{notice}</Alert>}

        <Stack gap="sm">
          <InputText
            placeholder={t('common.search_placeholder')}
            value={searchText}
            onChange={(event) => setSearchText(event.currentTarget.value)}
          />
          <Select
            label={t('common.filter_status')}
            value={statusFilter}
            onChange={(value) => setStatusFilter((value as 'all' | 'not_done' | 'done') ?? 'all')}
            data={[
              { value: 'all', label: t('exam_list.status_all') },
              { value: 'not_done', label: t('exam_list.status_not_done') },
              { value: 'done', label: t('exam_list.status_done') },
            ]}
          />
        </Stack>

        {filteredExams.length === 0 ? (
          <Alert color="blue" variant="light">{t('exam_list.no_results')}</Alert>
        ) : (
          <Paper withBorder radius="md" p="sm">
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('my_results.index')}</Table.Th>
                  <Table.Th>{t('common.exam')}</Table.Th>
                  <Table.Th>{t('common.subject')}</Table.Th>
                  <Table.Th>{t('common.time_minutes')}</Table.Th>
                  <Table.Th>{t('exam_list.deadline_column')}</Table.Th>
                  {isStaff && <Table.Th>{t('exam_list.active_sessions')}</Table.Th>}
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>{t('common.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredExams.map((item, idx) => {
                  const latest = latestSessionByExam.get(item.id);
                  const activeCount = isStaff ? activeSessionCountByExam[item.id] ?? 0 : 0;
                  const done = isStaff ? activeCount === 0 : Boolean(latest && latest.status !== 'active');
                  const pastDeadline = isPastExamStartDeadline(item, latest);
                  const deadlineLabel =
                    item.closes_at != null && item.closes_at !== ''
                      ? new Date(item.closes_at).toLocaleString()
                      : t('exam_list.deadline_none');
                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td>{item.title}</Table.Td>
                      <Table.Td>{item.subject_name || '—'}</Table.Td>
                      <Table.Td>{item.duration_min}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{deadlineLabel}</Text>
                      </Table.Td>
                      {isStaff && (
                        <Table.Td>
                          <Badge color={activeCount > 0 ? 'orange' : 'gray'}>
                            {activeCount}
                          </Badge>
                        </Table.Td>
                      )}
                      <Table.Td>
                        <Badge color={done ? 'green' : 'gray'}>
                          {done ? t('exam_list.status_done') : t('exam_list.status_not_done')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {isStaff ? (
                          <Group gap={6} wrap="nowrap">
                            <ButtonFilled
                              size="xs"
                              color="green"
                              loading={startingExamId === item.id}
                              label="Start"
                              disabled={startingExamId === item.id}
                              onClick={() => void handleStartExam(item)}
                            />
                            <ButtonFilled
                              size="xs"
                              color="gray"
                              label={t('exam_list.action_edit_questions')}
                              disabled={false}
                              onClick={() => navigate(`/exams/${item.id}/edit`)}
                            />
                            <ButtonFilled
                              size="xs"
                              color="blue"
                              loading={updatingExamId === item.id}
                              label="Set time"
                              disabled={updatingExamId === item.id || startingExamId === item.id}
                              onClick={() => void handleUpdateDuration(item)}
                            />
                            <ButtonFilled
                              size="xs"
                              color="red"
                              loading={forceSubmittingExamId === item.id}
                              label={t('exam_list.action_force_submit')}
                              disabled={activeCount === 0 || forceSubmittingExamId === item.id}
                              onClick={() => void handleForceSubmit(item.id)}
                            />
                          </Group>
                        ) : (
                          <>
                            <ButtonFilled
                              size="xs"
                              color="blue"
                              label={t('exam_list.action_take')}
                              disabled={pastDeadline}
                              title={pastDeadline ? t('exam_list.take_disabled_deadline') : undefined}
                              onClick={() => navigate(`/exam/${item.id}`)}
                            />
                            <ButtonFilled
                              size="xs"
                              style={{ marginLeft: 8 }}
                              color="gray"
                              label={t('exam_list.action_result')}
                              disabled={!done}
                              onClick={() => navigate(`/result/${item.id}`)}
                            />
                          </>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default ExamList;
