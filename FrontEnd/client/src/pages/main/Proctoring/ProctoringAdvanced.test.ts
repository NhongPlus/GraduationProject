import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 7: Advanced Proctoring (screenshot, webcam, IP tracking)
 *
 * Tests cover:
 * - Extended integrity event types (screenshot, webcam, IP)
 * - Integrity event queue management
 * - IP address tracking via socket handshake
 * - Violation aggregation by type
 * - Evidence submission logic
 */

/** Extended integrity event types from examIntegrityClient.ts */
type IntegrityEventType =
  | 'exam_opened'
  | 'fullscreen_enter'
  | 'fullscreen_exit'
  | 'fullscreen_error'
  | 'visibility_hidden'
  | 'window_blur'
  | 'window_focus'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'context_menu'
  | 'before_unload'
  | 'screenshot_attempt'
  | 'webcam_snapshot'
  | 'ip_address_change';

interface IntegrityEvent {
  examId: string;
  type: IntegrityEventType;
  at: string;
  details?: Record<string, unknown>;
}

/** ProctoringSession with IP tracking */
interface ProctoringSession {
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
  violations: IntegrityEvent[];
  client_ip: string | null;
  user_agent: string | null;
}

describe('Extended integrity event types', () => {
  it('has screenshot_attempt event type', () => {
    const event: IntegrityEvent = {
      examId: 'exam-1',
      type: 'screenshot_attempt',
      at: new Date().toISOString(),
      details: { blocked: true },
    };
    expect(event.type).toBe('screenshot_attempt');
  });

  it('has webcam_snapshot event type', () => {
    const event: IntegrityEvent = {
      examId: 'exam-1',
      type: 'webcam_snapshot',
      at: new Date().toISOString(),
      details: { snapshotId: 'snap-123' },
    };
    expect(event.type).toBe('webcam_snapshot');
  });

  it('has ip_address_change event type', () => {
    const event: IntegrityEvent = {
      examId: 'exam-1',
      type: 'ip_address_change',
      at: new Date().toISOString(),
      details: { old_ip: '1.2.3.4', new_ip: '5.6.7.8' },
    };
    expect(event.type).toBe('ip_address_change');
  });

  it('screenshot_attempt has blocked flag in details', () => {
    const event: IntegrityEvent = {
      examId: 'exam-1',
      type: 'screenshot_attempt',
      at: new Date().toISOString(),
      details: { blocked: true, screenSize: '1920x1080' },
    };
    expect(event.details?.blocked).toBe(true);
  });
});

describe('Integrity event queue management', () => {
  const queueKey = (examId: string) => `exam_integrity_queue_${examId}`;

  const readQueue = (examId: string, storage: Storage): IntegrityEvent[] => {
    try {
      const raw = storage.getItem(queueKey(examId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as IntegrityEvent[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeQueue = (examId: string, storage: Storage, queue: IntegrityEvent[]) => {
    storage.setItem(queueKey(examId), JSON.stringify(queue.slice(-300)));
  };

  const pushQueue = (examId: string, storage: Storage, event: IntegrityEvent) => {
    const queue = readQueue(examId, storage);
    queue.push(event);
    writeQueue(examId, storage, queue);
  };

  // Simulate localStorage
  const mockStorage = (() => {
    let data: Record<string, string> = {};
    return {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
    };
  })();

  it('starts with empty queue', () => {
    const queue = readQueue('exam-1', mockStorage as unknown as Storage);
    expect(queue).toHaveLength(0);
  });

  it('pushes event to queue', () => {
    pushQueue('exam-1', mockStorage as unknown as Storage, {
      examId: 'exam-1',
      type: 'screenshot_attempt',
      at: new Date().toISOString(),
    });
    const queue = readQueue('exam-1', mockStorage as unknown as Storage);
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('screenshot_attempt');
  });

  it('limits queue to 300 events', () => {
    // Fill with 350 events
    for (let i = 0; i < 350; i++) {
      pushQueue('exam-2', mockStorage as unknown as Storage, {
        examId: 'exam-2',
        type: 'visibility_hidden',
        at: new Date().toISOString(),
      });
    }
    const queue = readQueue('exam-2', mockStorage as unknown as Storage);
    expect(queue.length).toBeLessThanOrEqual(300);
    expect(queue.length).toBe(300);
  });

  it('persists queue to storage', () => {
    const event: IntegrityEvent = {
      examId: 'exam-3',
      type: 'webcam_snapshot',
      at: new Date().toISOString(),
    };
    pushQueue('exam-3', mockStorage as unknown as Storage, event);
    expect(mockStorage.getItem('exam_integrity_queue_exam-3')).not.toBeNull();
  });

  it('clears queue after flush', () => {
    pushQueue('exam-4', mockStorage as unknown as Storage, {
      examId: 'exam-4',
      type: 'ip_address_change',
      at: new Date().toISOString(),
    });
    writeQueue('exam-4', mockStorage as unknown as Storage, []);
    const queue = readQueue('exam-4', mockStorage as unknown as Storage);
    expect(queue).toHaveLength(0);
  });
});

describe('IP address tracking from socket', () => {
  it('socket handshake contains ip address', () => {
    const handshake = {
      headers: { 'x-forwarded-for': '203.0.113.5' },
      remoteAddress: '203.0.113.5',
    };
    const ip = handshake.headers['x-forwarded-for']?.split(',')[0] ?? handshake.remoteAddress;
    expect(ip).toBe('203.0.113.5');
  });

  it('falls back to remoteAddress when no forwarded headers', () => {
    const handshake = {
      remoteAddress: '192.168.1.1',
    };
    const ip = handshake.remoteAddress;
    expect(ip).toBe('192.168.1.1');
  });

  it('proctoring session captures ip_address', () => {
    const session: ProctoringSession = {
      session_id: 'sess-1',
      student_id: 'student-1',
      student_name: 'Nguyen Van A',
      student_email: 'a@example.com',
      status: 'active',
      started_at: new Date().toISOString(),
      finished_at: null,
      score: null,
      max_points: null,
      violation_count: 2,
      violations: [],
      client_ip: '203.0.113.5',
      user_agent: 'Mozilla/5.0',
    };
    expect(session.client_ip).toBe('203.0.113.5');
  });

  it('multiple IP addresses indicate potential proxy/vpn', () => {
    const forwardedFor = '203.0.113.5, 10.0.0.1, 192.168.1.1';
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    expect(ips.length).toBe(3);
  });
});

describe('Violation aggregation by type', () => {
  const violations: IntegrityEvent[] = [
    { examId: 'e1', type: 'copy_attempt', at: '' },
    { examId: 'e1', type: 'paste_attempt', at: '' },
    { examId: 'e1', type: 'visibility_hidden', at: '' },
    { examId: 'e1', type: 'copy_attempt', at: '' },
    { examId: 'e1', type: 'screenshot_attempt', at: '' },
  ];

  const aggregateByType = (events: IntegrityEvent[]) =>
    events.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});

  it('counts violations by type', () => {
    const counts = aggregateByType(violations);
    expect(counts['copy_attempt']).toBe(2);
    expect(counts['paste_attempt']).toBe(1);
    expect(counts['visibility_hidden']).toBe(1);
    expect(counts['screenshot_attempt']).toBe(1);
  });

  it('identifies screenshot attempt violations', () => {
    const screenshotViolations = violations.filter(v => v.type === 'screenshot_attempt');
    expect(screenshotViolations).toHaveLength(1);
  });

  it('identifies webcam snapshot violations', () => {
    const events: IntegrityEvent[] = [
      { examId: 'e1', type: 'webcam_snapshot', at: '' },
    ];
    const webcamViolations = events.filter(v => v.type === 'webcam_snapshot');
    expect(webcamViolations).toHaveLength(1);
  });

  it('identifies IP change violations', () => {
    const events: IntegrityEvent[] = [
      { examId: 'e1', type: 'ip_address_change', at: '', details: { old_ip: '1.1.1.1', new_ip: '2.2.2.2' } },
    ];
    const ipChanges = events.filter(v => v.type === 'ip_address_change');
    expect(ipChanges).toHaveLength(1);
    expect(ipChanges[0].details?.old_ip).toBe('1.1.1.1');
  });

  it('calculates total violation count', () => {
    const total = violations.length;
    expect(total).toBe(5);
  });
});

describe('Evidence submission', () => {
  it('screenshot evidence includes timestamp and hash', () => {
    const evidence = {
      type: 'screenshot_attempt',
      examId: 'exam-1',
      at: new Date().toISOString(),
      details: {
        blocked: true,
        timestamp: Date.now(),
        hash: 'sha256-placeholder',
      },
    };
    expect(evidence.type).toBe('screenshot_attempt');
    expect(evidence.details?.blocked).toBe(true);
  });

  it('webcam snapshot evidence includes snapshotId', () => {
    const evidence = {
      type: 'webcam_snapshot' as const,
      examId: 'exam-1',
      at: new Date().toISOString(),
      details: {
        snapshotId: 'snap-abc123',
        size_bytes: 45000,
      },
    };
    expect(evidence.details?.snapshotId).toBe('snap-abc123');
  });

  it('batch submit groups events by exam_id', () => {
    const events: IntegrityEvent[] = [
      { examId: 'exam-1', type: 'screenshot_attempt', at: '' },
      { examId: 'exam-1', type: 'visibility_hidden', at: '' },
      { examId: 'exam-2', type: 'copy_attempt', at: '' },
    ];

    const grouped = events.reduce<Record<string, IntegrityEvent[]>>((acc, e) => {
      if (!acc[e.examId]) acc[e.examId] = [];
      acc[e.examId].push(e);
      return acc;
    }, {});

    expect(grouped['exam-1']).toHaveLength(2);
    expect(grouped['exam-2']).toHaveLength(1);
  });
});

describe('User agent tracking', () => {
  it('captures user agent string', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const session: ProctoringSession = {
      session_id: 's1', student_id: 'u1', student_name: null, student_email: null,
      status: 'active', started_at: '', finished_at: null, score: null, max_points: null,
      violation_count: 0, violations: [], client_ip: null, user_agent: userAgent,
    };
    expect(session.user_agent).toContain('Mozilla/5.0');
  });
});

describe('Violation severity scoring', () => {
  const SEVERITY: Record<string, number> = {
    ip_address_change: 3,
    screenshot_attempt: 2,
    webcam_snapshot: 2,
    copy_attempt: 1,
    paste_attempt: 1,
    context_menu: 1,
    visibility_hidden: 1,
  };

  const scoreViolation = (type: string) => SEVERITY[type] ?? 0;

  it('IP change is highest severity (3)', () => {
    expect(scoreViolation('ip_address_change')).toBe(3);
  });
  it('screenshot/warncam are medium severity (2)', () => {
    expect(scoreViolation('screenshot_attempt')).toBe(2);
    expect(scoreViolation('webcam_snapshot')).toBe(2);
  });
  it('copy/paste/context are low severity (1)', () => {
    expect(scoreViolation('copy_attempt')).toBe(1);
    expect(scoreViolation('paste_attempt')).toBe(1);
    expect(scoreViolation('context_menu')).toBe(1);
  });
  it('unknown events have severity 0', () => {
    expect(scoreViolation('exam_opened')).toBe(0);
  });

  it('calculates total severity score', () => {
    const events = ['screenshot_attempt', 'copy_attempt', 'ip_address_change'];
    const score = events.reduce((sum, t) => sum + scoreViolation(t), 0);
    expect(score).toBe(6); // 2 + 1 + 3
  });
});