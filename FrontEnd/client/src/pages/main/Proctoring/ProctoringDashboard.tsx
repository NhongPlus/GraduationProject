import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, TextInput, Select, Button, Modal, Tooltip,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconUsers, IconAlertCircle, IconSend } from '@tabler/icons-react';
import examApi from '@/services/examApi';
import appConfig from '@/configs/app.config';
import { createProctoringSocket, requestPresence, sendGroupBroadcast, leaveProctoring, type PresencePayload } from '@/services/proctoringSocket';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';
import type { Socket } from 'socket.io-client';

type ViolationEvent = {
  event_type: string;
  client_at: string;
  details: Record<string, unknown> | null;
};

type ProctoringSession = {
  session_id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  status: 'active' | 'submitted' | 'expired';
  started_at: string;
  finished_at: string | null;
  score: number | null;
  max_points: number | null;
  violation_count: number;
  violations: ViolationEvent[];
};

type ProctoringData = {
  exam_id: string;
  total_sessions: number;
  active_sessions: number;
  submitted_sessions: number;
  expired_sessions: number;
  sessions: ProctoringSession[];
};

const EVENT_LABELS: Record<string, string> = {
  exam_opened: 'Mở đề',
  fullscreen_enter: 'Vào fullscreen',
  fullscreen_exit: 'Thoát fullscreen',
  fullscreen_error: 'Lỗi fullscreen',
  visibility_hidden: 'Chuyển tab',
  window_blur: 'Mất focus',
  window_focus: 'Quay lại',
  copy_attempt: 'Copy',
  paste_attempt: 'Paste',
  context_menu: 'Menu chuột phải',
  before_unload: 'Thoát trang',
};

const ProctoringDashboard = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProctoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertingSession, setAlertingSession] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresencePayload | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting'|'connected'|'disconnected'|'reconnecting'>('connecting');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastGroup, setBroadcastGroup] = useState<'all'|'violators'|'active'>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      try {
        setLoading(true);
        const d = await examApi.getExamProctoring(examId);
        setData(d);
      } catch {
        setError('Không tải được dữ liệu giám sát.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  // Proctoring socket
  useEffect(() => {
    if (!examId || !accessToken) return;

    const socket = createProctoringSocket({
      baseUrl: appConfig.apiURL,
      token: accessToken,
      examId,
      forcePolling: import.meta.env.VITE_SOCKET_FORCE_POLLING === 'true',
      handlers: {
        onConnect: () => setConnectionStatus('connected'),
        onDisconnect: () => setConnectionStatus('disconnected'),
        onReconnecting: () => setConnectionStatus('reconnecting'),
        onPresenceUpdate: (p) => setPresence(p),
        onGroupAlert: (p) => {
          setRealtimeAlert(p.message);
          setTimeout(() => setRealtimeAlert(null), 5000);
        },
        onBroadcastSent: () => {
          setBroadcastOpen(false);
          setBroadcastMessage('');
        },
        onError: (msg) => setError(`Socket: ${msg}`),
      },
    });
    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        leaveProctoring(socketRef.current, examId);
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [examId, accessToken]);

  const handleBroadcast = useCallback(() => {
    if (!socketRef.current || !broadcastMessage.trim()) return;
    sendGroupBroadcast(socketRef.current, examId!, broadcastGroup, broadcastMessage);
  }, [examId, broadcastGroup, broadcastMessage]);

  const handleForceSubmit = async (sessionId: string) => {
    if (!examId) return;
    try {
      setAlertingSession(sessionId);
      await examApi.forceSubmitExam(examId);
      const d = await examApi.getExamProctoring(examId);
      setData(d);
    } catch {
      setError('Force-submit thất bại.');
    } finally {
      setAlertingSession(null);
    }
  };

  const getViolationBadge = (count: number) => {
    if (count === 0) return <Badge color="gray" size="sm">0 vi phạm</Badge>;
    if (count <= 3) return <Badge color="yellow" size="sm">{count} vi phạm</Badge>;
    return <Badge color="red" size="sm">{count} vi phạm</Badge>;
  };

  const getStatusBadge = (status: ProctoringSession['status']) => {
    const map: Record<string, { color: string; label: string }> = {
      active: { color: 'orange', label: 'Đang thi' },
      submitted: { color: 'green', label: 'Đã nộp' },
      expired: { color: 'gray', label: 'Hết giờ' },
    };
    const { color, label } = map[status] ?? { color: 'gray', label: status };
    return <Badge color={color} size="sm">{label}</Badge>;
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
        <Alert color="red" variant="light">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('proctoring.title')}
          subtitle={t('proctoring.subtitle')}
          accent="teal"
          action={
            <ButtonLight
              size="sm"
              label={t('common.back')}
              disabled={false}
              onClick={() => navigate(-1)}
            />
          }
        />

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Tổng phiên</Text>
            <Text fw={700} size="xl">{data.total_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Đang thi</Text>
            <Text fw={700} size="xl" c="orange">{data.active_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Đã nộp</Text>
            <Text fw={700} size="xl" c="green">{data.submitted_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Hết giờ</Text>
            <Text fw={700} size="xl" c="gray">{data.expired_sessions}</Text>
          </Paper>
        </Group>

        {data.active_sessions > 0 && (
          <Alert color="orange" variant="light">
            Có {data.active_sessions} sinh viên đang thi. Giám thị giám sát trong thời gian thực.
          </Alert>
        )}

        {/* Presence indicator + Broadcast button */}
        <Group justify="space-between">
          <Group gap="sm">
            {presence && (
              <Tooltip label={`${presence.teachers} GV, ${presence.admins} Admin, ${presence.students} SV đang theo dõi`}>
                <Badge leftSection={<IconUsers size={14} />} color="teal" size="lg" variant="light">
                  {presence.total} người giám sát
                </Badge>
              </Tooltip>
            )}
            <Badge
              color={
                connectionStatus === 'connected' ? 'green'
                : connectionStatus === 'reconnecting' ? 'orange'
                : connectionStatus === 'connecting' ? 'yellow'
                : 'red'
              }
              size="sm"
              variant="light"
            >
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
            </Badge>
            {realtimeAlert && (
              <Alert color="blue" variant="light" p="xs" py={4} px="sm">
                <Text size="xs">{realtimeAlert}</Text>
              </Alert>
            )}
          </Group>
          <Button
            size="sm"
            leftSection={<IconSend size={14} />}
            onClick={() => setBroadcastOpen(true)}
            variant="light"
            color="teal"
          >
            Gửi thông báo
          </Button>
        </Group>

        {/* Broadcast modal */}
        <Modal opened={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Gửi thông báo đến sinh viên" centered>
          <Stack gap="sm">
            <Select
              label="Nhóm nhận"
              value={broadcastGroup}
              onChange={(v) => setBroadcastGroup(v as 'all' | 'violators' | 'active')}
              data={[
                { value: 'all', label: 'Tất cả sinh viên' },
                { value: 'active', label: 'Đang thi' },
                { value: 'violators', label: 'Sinh viên vi phạm' },
              ]}
            />
            <TextInput
              label="Tin nhắn"
              placeholder="VD: Sắp hết giờ, vui lòng nộp bài..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            />
            <Button onClick={handleBroadcast} color="teal" disabled={!broadcastMessage.trim()}>
              Gửi
            </Button>
          </Stack>
        </Modal>

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('proctoring.student')}</Table.Th>
                <Table.Th>{t('proctoring.status')}</Table.Th>
                <Table.Th>{t('proctoring.started_at')}</Table.Th>
                <Table.Th>{t('proctoring.score')}</Table.Th>
                <Table.Th>{t('proctoring.violations')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.sessions.map((session, idx) => (
                <>
                  <Table.Tr key={session.session_id}>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>{session.student_name || session.student_id}</Text>
                        <Text size="xs" c="dimmed">{session.student_email || '—'}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(session.status)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(session.started_at).toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {session.score != null ? `${session.score}/${session.max_points}` : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{getViolationBadge(session.violation_count)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ButtonLight
                          size="xs"
                          color={expandedRow === session.session_id ? 'blue' : 'gray'}
                          label={expandedRow === session.session_id ? 'Ẩn log' : 'Xem log'}
                          disabled={false}
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === session.session_id ? null : session.session_id
                            )
                          }
                        />
                        {session.status === 'active' && (
                          <ButtonFilled
                            size="xs"
                            color="red"
                            label="Force submit"
                            loading={alertingSession === session.session_id}
                            disabled={alertingSession === session.session_id}
                            onClick={() => void handleForceSubmit(session.session_id)}
                          />
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  {expandedRow === session.session_id && (
                    <Table.Tr key={`${session.session_id}-log`}>
                      <Table.Td colSpan={7}>
                        <Paper withBorder radius="sm" p="sm" bg="gray.0">
                          <Text size="xs" fw={600} mb="xs">Nhật ký vi phạm</Text>
                          {session.violations.length === 0 ? (
                            <Text size="xs" c="dimmed">Không có vi phạm.</Text>
                          ) : (
                            <Stack gap={4}>
                              {session.violations.map((v, vi) => (
                                <Group key={vi} gap="xs">
                                  <Badge size="xs" color="red" variant="light">
                                    {EVENT_LABELS[v.event_type] || v.event_type}
                                  </Badge>
                                  <Text size="xs">{new Date(v.client_at).toLocaleString()}</Text>
                                </Group>
                              ))}
                            </Stack>
                          )}
                        </Paper>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </>
              ))}
              {data.sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">{t('proctoring.no_sessions')}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ProctoringDashboard;
