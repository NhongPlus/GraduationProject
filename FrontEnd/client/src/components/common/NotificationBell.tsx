import { useState, useEffect, useRef } from 'react';
import { Badge, Box, Button, Divider, Group, Menu, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, type UserNotificationItem } from '@/services/notificationApi';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins}p trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h trước`;
  const days = Math.floor(hrs / 24);
  return `${days}d trước`;
}

function typeColor(type: UserNotificationItem['type']): string {
  switch (type) {
    case 'warning': return 'var(--mantine-color-yellow-6)';
    case 'error': return 'var(--mantine-color-red-6)';
    case 'success': return 'var(--mantine-color-green-6)';
    default: return 'var(--mantine-color-blue-6)';
  }
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const [listRes, countRes] = await Promise.all([
        getNotifications({ limit: 10 }),
        getUnreadCount(),
      ]);
      setNotifications(listRes.data);
      setUnreadCount(countRes);
    } catch (err) {
      // Non-critical — but log so deploy/DB issues are visible in DevTools
      if (import.meta.env.DEV) {
        console.warn('[NotificationBell] load failed', err);
      }
    }
  }

  useEffect(() => {
    void load();
    // Poll every 30s when the dropdown is open, or every 60s otherwise
    pollRef.current = setInterval(() => { void load(); }, opened ? 30_000 : 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  async function handleMarkAll() {
    setLoading(true);
    try {
      await markAllAsRead();
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkOne(id: string) {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  return (
    <Menu shadow="md" width={360} opened={opened} onChange={setOpened} position="bottom-end">
      <Menu.Target>
        <Box pos="relative" style={{ cursor: 'pointer' }}>
          <Tooltip label={t('notification.tooltip')}>
            <Button variant="subtle" color="gray" size="md" px={8} aria-label="Notifications">
              <Bell size={20} />
            </Button>
          </Tooltip>
          {unreadCount > 0 && (
            <Badge
              size="xs"
              variant="filled"
              color="red"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                fontSize: 10,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Menu.Target>

      <Menu.Dropdown p={0}>
        {/* Header */}
        <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Text fw={600} size="sm">{t('notification.title')}</Text>
          {unreadCount > 0 && (
            <Tooltip label={t('notification.mark_all_read')}>
              <Button variant="subtle" size="xs" color="blue" onClick={handleMarkAll} loading={loading}>
                <CheckCheck size={16} />
              </Button>
            </Tooltip>
          )}
        </Group>

        {/* List */}
        <Box style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              {t('notification.empty')}
            </Text>
          ) : (
            notifications.map(n => (
              <Box
                key={n.id}
                style={{
                  background: n.is_read ? undefined : 'var(--mantine-color-blue-0)',
                  borderLeft: `3px solid ${n.is_read ? 'transparent' : typeColor(n.type)}`,
                }}
              >
                <Box p="xs">
                  <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Text size="sm" fw={n.is_read ? 400 : 600} lineClamp={1} style={{ flex: 1 }}>
                      {n.title}
                    </Text>
                    {!n.is_read && (
                      <Tooltip label={t('notification.mark_read')}>
                        <Button variant="subtle" size="xs" color="green" onClick={() => { void handleMarkOne(n.id); }} style={{ flexShrink: 0 }}>
                          <Check size={14} />
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{n.message}</Text>
                  <Group justify="space-between" mt={4}>
                    <Text size="xs" c="dimmed">{timeAgo(n.created_at)}</Text>
                    {n.link && (
                      <Tooltip label={t('notification.go_to')}>
                        <a href={n.link} target="_blank" rel="noreferrer" onClick={() => { void handleMarkOne(n.id); }}>
                          <ExternalLink size={12} />
                        </a>
                      </Tooltip>
                    )}
                  </Group>
                </Box>
                <Divider />
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Button
              variant="subtle"
              size="xs"
              fullWidth
              onClick={() => { window.location.href = '/notifications'; }}
            >
              {t('common.view_all')}
            </Button>
          </Box>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}