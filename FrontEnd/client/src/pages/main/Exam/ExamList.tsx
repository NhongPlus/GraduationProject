import { useEffect, useMemo, useState } from 'react';
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
  Button,
  Menu,
  ActionIcon,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerStop,
  IconEdit,
  IconClock,
  IconTrash,
  IconClipboardList,
} from '@tabler/icons-react';
import examApi from '@/services/examApi';
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import { useExamListState } from '@/hooks/useExamListState';
import InputText from '@/components/Input/InputText/InputText';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { isPastExamStartDeadline } from '@/utils/examDeadline';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, slicePage } from '@/utils/pagination';
import { enterExamRoom } from '@/utils/enterExamRoom';

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
    submittedSessionByExam,
    hasSubmitted,
    hasRetakeGrant,
    activeSessionCountByExam,
    runtimeActiveByExam,
    filteredExams,
    doneCount,
    handleStartExam,
    handleUpdateDuration,
    handleForceSubmit,
  } = useExamListState({ isStaff, t });

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setListPage(1);
  }, [searchText, statusFilter]);

  const paginatedExams = useMemo(
    () => slicePage(filteredExams, listPage, listPageSize),
    [filteredExams, listPage, listPageSize]
  );

  const handleDeleteExam = (examId: string, examTitle: string) => {
    modals.open({
      title: t('exam_list.confirm_delete_title', 'Xóa bài thi'),
      centered: true,
      children: (
        <Stack gap="md">
          <Text>{t('exam_list.confirm_delete_msg', 'Bạn có chắc muốn xóa bài thi này?')}</Text>
          <Text fw={700}>{examTitle}</Text>
          <Text size="sm" c="red">{t('exam_list.confirm_delete_warn', 'Hành động này không thể hoàn tác.')}</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button color="red" onClick={async () => {
              try {
                await examApi.deleteExam(examId);
                modals.closeAll();
                window.location.reload();
              } catch {
                modals.closeAll();
              }
            }}>
              {t('common.delete', 'Xóa')}
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

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
            onChange={(value) => {
              setStatusFilter((value as 'all' | 'not_done' | 'done') ?? 'all');
              setListPage(1);
            }}
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
          <Paper withBorder radius="md">
            <ListPaginationBar
              page={listPage}
              total={filteredExams.length}
              limit={listPageSize}
              onPageChange={setListPage}
              onLimitChange={(next) => {
                setListPageSize(next);
                setListPage(1);
              }}
            />
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
                {paginatedExams.map((item, idx) => {
                  const latest = latestSessionByExam.get(item.id);
                  const activeCount = isStaff ? activeSessionCountByExam[item.id] ?? 0 : 0;
                  const runtimeActive = isStaff ? Boolean(runtimeActiveByExam[item.id]) : false;
                  const examInProgress = runtimeActive || activeCount > 0;
                  const studentSubmitted = !isStaff && hasSubmitted(item.id);
                  const canRetake = !isStaff && hasRetakeGrant(item.id);
                  const done = isStaff
                    ? !examInProgress
                    : studentSubmitted && !canRetake;
                  const pastDeadline = isPastExamStartDeadline(item, latest);
                  const deadlineLabel =
                    item.closes_at != null && item.closes_at !== ''
                      ? new Date(item.closes_at).toLocaleString()
                      : t('exam_list.deadline_none');
                  const rowNavigate = isStaff
                    ? () => navigate(`/exam-sessions/${item.id}`)
                    : () => {
                        if (studentSubmitted && !canRetake) {
                          navigate(`/result/${item.id}`);
                          return;
                        }
                        void enterExamRoom(navigate, item.id);
                      };
                  return (
                    <Table.Tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={rowNavigate}
                    >
                      <Table.Td>{(listPage - 1) * listPageSize + idx + 1}</Table.Td>
                      <Table.Td>
                        <Text fw={500}>{item.title}</Text>
                      </Table.Td>
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
                        <Badge
                          color={
                            canRetake ? 'orange' : done ? 'green' : 'gray'
                          }
                        >
                          {canRetake
                            ? t('exam_list.status_retake_granted')
                            : done
                              ? t('exam_list.status_done')
                              : t('exam_list.status_not_done')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {isStaff ? (
                          <Group gap={4} wrap="nowrap">
                            {examInProgress ? (
                              <Button
                                size="xs"
                                color="red"
                                variant="filled"
                                leftSection={<IconPlayerStop size={13} />}
                                loading={forceSubmittingExamId === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleForceSubmit(item.id); }}
                              >
                                {t('exam_list.action_force_submit', 'Ép nộp bài')}
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                color="green"
                                variant="light"
                                leftSection={<IconPlayerPlay size={13} />}
                                loading={startingExamId === item.id}
                                disabled={startingExamId === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleStartExam(item); }}
                              >
                                {t('exam_list.action_start', 'Bắt đầu thi')}
                              </Button>
                            )}
                            <Menu shadow="md" width={170} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <IconDotsVertical size={15} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={13} />} onClick={(e) => { e.stopPropagation(); navigate(`/exams/${item.id}/edit`); }}>
                                  {t('exam_list.action_edit_questions', 'Sửa câu hỏi')}
                                </Menu.Item>
                                <Menu.Item leftSection={<IconClock size={13} />} onClick={(e) => { e.stopPropagation(); void handleUpdateDuration(item); }}>
                                  {t('exam_list.action_set_time', 'Đặt giờ')}
                                </Menu.Item>
                                <Menu.Item leftSection={<IconClipboardList size={13} />} onClick={(e) => { e.stopPropagation(); navigate(`/exam-sessions/${item.id}`); }}>
                                  {t('exam_sessions.action_manage', 'Quản lý phiên thi')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item color="red" leftSection={<IconTrash size={13} />} onClick={(e) => { e.stopPropagation(); handleDeleteExam(item.id, item.title); }}>
                                  {t('common.delete', 'Xóa')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        ) : (
                          <>
                            <ButtonFilled
                              size="xs"
                              color="blue"
                              label={t('exam_list.action_take')}
                              disabled={pastDeadline || (studentSubmitted && !canRetake)}
                              title={
                                studentSubmitted && !canRetake
                                  ? t('exam_list.take_disabled_submitted', 'Bạn đã nộp bài thi này')
                                  : pastDeadline
                                    ? t('exam_list.take_disabled_deadline')
                                    : canRetake
                                      ? t('exam_list.take_retake_hint')
                                      : undefined
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (studentSubmitted && !canRetake) return;
                                void enterExamRoom(navigate, item.id);
                              }}
                            />
                            <ButtonFilled
                              size="xs"
                              style={{ marginLeft: 8 }}
                              color="gray"
                              label={t('exam_list.action_result')}
                              disabled={!studentSubmitted && !canRetake}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/result/${item.id}`);
                              }}
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
