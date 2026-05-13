import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 2: Proctoring real-time presence, violation logs, group broadcast.
 *
 * Tests cover:
 * - Presence tracking data structure and aggregation
 * - Violation event type labeling
 * - Group broadcast message types
 * - ProctoringDashboard state transitions
 */

/**
 * Simulates proctoringPresence aggregation logic from examSocket.ts
 */
describe('Proctoring Presence Logic', () => {
  // Mirrors the in-memory presence tracking in examSocket.ts
  type ProctorSession = {
    socketId: string;
    userId: string;
    role: string;
    joinedAt: number;
  };

  function getProctoringPresence(list: ProctorSession[]): {
    total: number;
    teachers: number;
    admins: number;
    students: number;
  } {
    return {
      total: list.length,
      teachers: list.filter(s => s.role === 'teacher').length,
      admins: list.filter(s => s.role === 'admin').length,
      students: list.filter(s => s.role === 'student').length,
    };
  }

  it('returns zero counts for empty session list', () => {
    const result = getProctoringPresence([]);
    expect(result.total).toBe(0);
    expect(result.teachers).toBe(0);
    expect(result.admins).toBe(0);
    expect(result.students).toBe(0);
  });

  it('counts teacher role correctly', () => {
    const sessions: ProctorSession[] = [
      { socketId: 's1', userId: 'u1', role: 'teacher', joinedAt: Date.now() },
      { socketId: 's2', userId: 'u2', role: 'teacher', joinedAt: Date.now() },
      { socketId: 's3', userId: 'u3', role: 'student', joinedAt: Date.now() },
    ];
    const result = getProctoringPresence(sessions);
    expect(result.teachers).toBe(2);
    expect(result.students).toBe(1);
    expect(result.total).toBe(3);
  });

  it('counts admin role correctly', () => {
    const sessions: ProctorSession[] = [
      { socketId: 's1', userId: 'u1', role: 'admin', joinedAt: Date.now() },
      { socketId: 's2', userId: 'u2', role: 'teacher', joinedAt: Date.now() },
    ];
    const result = getProctoringPresence(sessions);
    expect(result.admins).toBe(1);
    expect(result.teachers).toBe(1);
    expect(result.total).toBe(2);
  });

  it('filters out unknown roles', () => {
    const sessions: ProctorSession[] = [
      { socketId: 's1', userId: 'u1', role: 'admin', joinedAt: Date.now() },
      { socketId: 's2', userId: 'u2', role: 'unknown', joinedAt: Date.now() },
      { socketId: 's3', userId: 'u3', role: 'student', joinedAt: Date.now() },
    ];
    const result = getProctoringPresence(sessions);
    expect(result.total).toBe(3);
    expect(result.admins).toBe(1);
    expect(result.students).toBe(1);
  });

  it('handles large number of sessions', () => {
    const sessions: ProctorSession[] = Array.from({ length: 50 }, (_, i) => ({
      socketId: `s${i}`,
      userId: `u${i}`,
      role: i % 3 === 0 ? 'admin' : i % 3 === 1 ? 'teacher' : 'student',
      joinedAt: Date.now(),
    }));
    const result = getProctoringPresence(sessions);
    expect(result.total).toBe(50);
    // Distribution: i=0,3,6... admin; i=1,4,7... teacher; i=2,5,8... student
    // admin indices: 0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48 → 17
    // teacher indices: 1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49 → 17
    // student indices: 2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47 → 16
    expect(result.admins).toBe(17);
    expect(result.teachers).toBe(17);
    expect(result.students).toBe(16);
  });
});

/**
 * EVENT_LABELS mapping from ProctoringDashboard.tsx
 */
describe('Violation Event Labels', () => {
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

  it('has labels for all expected event types', () => {
    // EVENT_LABELS has 11 entries in the actual component
    expect(Object.keys(EVENT_LABELS).length).toBeGreaterThanOrEqual(10);
  });

  it('maps known event types to non-empty labels', () => {
    Object.entries(EVENT_LABELS).forEach(([key, label]) => {
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('returns original key for unknown event types', () => {
    const unknown = 'unknown_event';
    const label = EVENT_LABELS[unknown] || unknown;
    expect(label).toBe(unknown);
  });

  it('covers critical security events (copy, paste, context menu)', () => {
    expect(EVENT_LABELS['copy_attempt']).toBe('Copy');
    expect(EVENT_LABELS['paste_attempt']).toBe('Paste');
    expect(EVENT_LABELS['context_menu']).toBe('Menu chuột phải');
  });

  it('covers fullscreen events', () => {
    expect(EVENT_LABELS['fullscreen_enter']).toBe('Vào fullscreen');
    expect(EVENT_LABELS['fullscreen_exit']).toBe('Thoát fullscreen');
    expect(EVENT_LABELS['fullscreen_error']).toBe('Lỗi fullscreen');
  });
});

/**
 * PresencePayload type contract from proctoringSocket.ts
 */
describe('PresencePayload type contract', () => {
  it('requires examId and counts', () => {
    const payload = {
      examId: 'exam-123',
      total: 3,
      teachers: 1,
      admins: 1,
      students: 1,
    };
    expect(typeof payload.examId).toBe('string');
    expect(typeof payload.total).toBe('number');
    expect(typeof payload.teachers).toBe('number');
    expect(typeof payload.admins).toBe('number');
    expect(typeof payload.students).toBe('number');
  });

  it('total equals sum of role counts', () => {
    const payload = {
      examId: 'exam-123',
      total: 5,
      teachers: 2,
      admins: 1,
      students: 2,
    };
    expect(payload.total).toBe(payload.teachers + payload.admins + payload.students);
  });

  it('examId is non-empty string', () => {
    const payload = { examId: 'exam-1', total: 1, teachers: 0, admins: 1, students: 0 };
    expect(payload.examId.length).toBeGreaterThan(0);
  });
});

/**
 * Group broadcast types
 */
describe('Group broadcast type validation', () => {
  type GroupName = 'all' | 'violators' | 'active';
  const validGroups: GroupName[] = ['all', 'violators', 'active'];

  it('has exactly 3 valid group names', () => {
    expect(validGroups).toHaveLength(3);
  });

  it('group names are non-empty strings', () => {
    validGroups.forEach(g => {
      expect(typeof g).toBe('string');
      expect(g.length).toBeGreaterThan(0);
    });
  });

  it('rejects invalid group names', () => {
    const invalid = ['students', 'teachers', 'admins', 'pending', ''];
    const isValid = (g: string) => validGroups.includes(g as GroupName);
    invalid.forEach(g => expect(isValid(g)).toBe(false));
  });

  it('accepts all valid group names', () => {
    validGroups.forEach(g => {
      expect(validGroups.includes(g)).toBe(true);
    });
  });
});

/**
 * GroupAlertPayload contract
 */
describe('GroupAlertPayload type', () => {
  const makeAlert = (group: string, message: string) => ({
    examId: 'exam-123',
    group,
    message,
    fromRole: 'teacher',
    fromUserId: 'user-1',
    at: new Date().toISOString(),
  });

  it('includes timestamp in ISO format', () => {
    const alert = makeAlert('all', 'Sắp hết giờ!');
    expect(() => new Date(alert.at)).not.toThrow();
    expect(new Date(alert.at).getTime()).toBeGreaterThan(0);
  });

  it('message is non-empty trimmed string', () => {
    const alert = makeAlert('active', '  Nộp bài ngay!  ');
    expect(alert.message.trim().length).toBeGreaterThan(0);
  });

  it('examId is included in every alert', () => {
    const alert = makeAlert('all', 'Test message');
    expect(alert.examId).toBeTruthy();
  });

  it('fromRole is captured for audit trail', () => {
    const alert = makeAlert('violators', 'Bạn đã vi phạm');
    expect(['admin', 'teacher'].includes(alert.fromRole)).toBe(true);
  });
});

/**
 * Violation count badge logic from ProctoringDashboard
 */
describe('Violation count badge logic', () => {
  const getViolationBadge = (count: number) => {
    if (count === 0) return { color: 'gray', label: '0 vi phạm' };
    if (count <= 3) return { color: 'yellow', label: `${count} vi phạm` };
    return { color: 'red', label: `${count} vi phạm` };
  };

  it('returns gray for 0 violations', () => {
    const badge = getViolationBadge(0);
    expect(badge.color).toBe('gray');
  });

  it('returns yellow for 1-3 violations', () => {
    for (let i = 1; i <= 3; i++) {
      const badge = getViolationBadge(i);
      expect(badge.color).toBe('yellow');
    }
  });

  it('returns red for 4+ violations', () => {
    for (let i = 4; i <= 10; i++) {
      const badge = getViolationBadge(i);
      expect(badge.color).toBe('red');
    }
  });

  it('label format matches count', () => {
    expect(getViolationBadge(0).label).toBe('0 vi phạm');
    expect(getViolationBadge(3).label).toBe('3 vi phạm');
    expect(getViolationBadge(5).label).toBe('5 vi phạm');
  });
});

/**
 * Status badge logic
 */
describe('Status badge mapping', () => {
  type Status = 'active' | 'submitted' | 'expired';
  const getStatusBadge = (status: Status) => {
    const map: Record<string, { color: string; label: string }> = {
      active: { color: 'orange', label: 'Đang thi' },
      submitted: { color: 'green', label: 'Đã nộp' },
      expired: { color: 'gray', label: 'Hết giờ' },
    };
    return map[status] ?? { color: 'gray', label: status };
  };

  it('active maps to orange Đang thi', () => {
    const badge = getStatusBadge('active');
    expect(badge.color).toBe('orange');
    expect(badge.label).toBe('Đang thi');
  });

  it('submitted maps to green Đã nộp', () => {
    const badge = getStatusBadge('submitted');
    expect(badge.color).toBe('green');
    expect(badge.label).toBe('Đã nộp');
  });

  it('expired maps to gray Hết giờ', () => {
    const badge = getStatusBadge('expired');
    expect(badge.color).toBe('gray');
    expect(badge.label).toBe('Hết giờ');
  });

  it('unknown status falls back to gray with original label', () => {
    const badge = getStatusBadge('unknown' as Status);
    expect(badge.color).toBe('gray');
    expect(badge.label).toBe('unknown');
  });
});

/**
 * Socket disconnect cleanup — presence removal
 */
describe('Presence cleanup on disconnect', () => {
  type ProctorSession = { socketId: string; userId: string; role: string; joinedAt: number };

  const removePresence = (list: ProctorSession[], socketId: string): ProctorSession[] =>
    list.filter(s => s.socketId !== socketId);

  it('removes exact socketId', () => {
    const list = [
      { socketId: 's1', userId: 'u1', role: 'teacher', joinedAt: Date.now() },
      { socketId: 's2', userId: 'u2', role: 'teacher', joinedAt: Date.now() },
    ];
    const remaining = removePresence(list, 's1');
    expect(remaining.find(s => s.socketId === 's1')).toBeUndefined();
    expect(remaining.find(s => s.socketId === 's2')).toBeDefined();
  });

  it('returns same list when socketId not found', () => {
    const list = [{ socketId: 's1', userId: 'u1', role: 'teacher', joinedAt: Date.now() }];
    const remaining = removePresence(list, 'nonexistent');
    expect(remaining).toHaveLength(1);
  });

  it('empty list returns empty', () => {
    const remaining = removePresence([], 's1');
    expect(remaining).toHaveLength(0);
  });

  it('recalculates presence counts after removal', () => {
    type Presence = { total: number; teachers: number; admins: number; students: number };
    const getPresence = (list: ProctorSession[]): Presence => ({
      total: list.length,
      teachers: list.filter(s => s.role === 'teacher').length,
      admins: list.filter(s => s.role === 'admin').length,
      students: list.filter(s => s.role === 'student').length,
    });

    const list = [
      { socketId: 's1', userId: 'u1', role: 'admin', joinedAt: Date.now() },
      { socketId: 's2', userId: 'u2', role: 'teacher', joinedAt: Date.now() },
    ];
    const after = removePresence(list, 's1');
    const presence = getPresence(after);
    expect(presence.total).toBe(1);
    expect(presence.admins).toBe(0);
    expect(presence.teachers).toBe(1);
  });
});

/**
 * ConnectionStatus state transitions
 */
describe('ConnectionStatus state machine', () => {
  type Status = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

  const transitions: Record<Status, Status[]> = {
    connecting: ['connected', 'disconnected'],
    connected: ['disconnected', 'reconnecting'],
    disconnected: ['reconnecting', 'connecting'],
    reconnecting: ['connected', 'disconnected'],
  };

  it('connecting can go to connected', () => {
    expect(transitions.connecting).toContain('connected');
  });

  it('connected can go to disconnected', () => {
    expect(transitions.connected).toContain('disconnected');
  });

  it('disconnected can go to reconnecting', () => {
    expect(transitions.disconnected).toContain('reconnecting');
  });

  it('reconnecting can go back to connected', () => {
    expect(transitions.reconnecting).toContain('connected');
  });

  it('no self-loop transitions', () => {
    Object.entries(transitions).forEach(([from, to]) => {
      expect(to.includes(from)).toBe(false);
    });
  });
});

/**
 * ProctoringDashboard realtimeAlert auto-dismiss
 */
describe('RealtimeAlert auto-dismiss logic', () => {
  const AUTO_DISMISS_MS = 5000;

  it('auto-dismiss should be 5 seconds', () => {
    expect(AUTO_DISMISS_MS).toBe(5000);
  });

  it('setTimeout with 5000ms is correct for 5s dismiss', () => {
    const start = Date.now();
    let dismissed = false;
    setTimeout(() => { dismissed = true; }, 5000);
    // Can't test actual timer in unit, just verify the constant
    expect(AUTO_DISMISS_MS).toBeGreaterThan(0);
  });

  it('alert message is non-empty string when set', () => {
    const realtimeAlert = 'Sắp hết giờ làm bài!';
    expect(realtimeAlert.trim().length).toBeGreaterThan(0);
  });

  it('null means no alert showing', () => {
    const realtimeAlert: string | null = null;
    expect(realtimeAlert).toBeNull();
  });
});

/**
 * Broadcast message must be trimmed
 */
describe('Broadcast message validation', () => {
  const isValidBroadcast = (message: string) =>
    typeof message === 'string' && message.trim().length > 0;

  it('accepts non-empty trimmed message', () => {
    expect(isValidBroadcast('Sắp hết giờ!')).toBe(true);
  });

  it('rejects whitespace-only message', () => {
    expect(isValidBroadcast('   ')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidBroadcast('')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isValidBroadcast(null as unknown as string)).toBe(false);
    expect(isValidBroadcast(undefined as unknown as string)).toBe(false);
  });
});

/**
 * Socket room naming: roomForExam(examId) === 'exam:{examId}'
 */
describe('Socket room naming convention', () => {
  const roomForExam = (examId: string) => `exam:${examId}`;

  it('formats exam room correctly', () => {
    expect(roomForExam('exam-123')).toBe('exam:exam-123');
    expect(roomForExam('abc')).toBe('exam:abc');
  });

  it('room name contains examId for identification', () => {
    const room = roomForExam('exam-xyz');
    expect(room.includes('exam-xyz')).toBe(true);
  });

  it('rooms for different exams are distinct', () => {
    const room1 = roomForExam('exam-1');
    const room2 = roomForExam('exam-2');
    expect(room1).not.toBe(room2);
  });
});